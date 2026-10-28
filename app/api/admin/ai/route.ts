import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canUseAgent } from "@/lib/ai/agents";
import { adminApi } from "@/lib/server/admin-api";
import { rateLimited } from "@/lib/server/ai";
import { adminAssistantPrompt } from "@/lib/server/ai-agent/prompt";
import { completeWithAI, getAIProviderStatus } from "@/lib/server/ai-agent/providers";
import { runAgentTools } from "@/lib/server/ai-agent/tools";
import { logAudit } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

const MessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(800) }).strip();
const RequestSchema = z.object({
  agentId: z.enum(["business", "sales", "inventory", "purchasing", "accounting"]),
  messages: z.array(MessageSchema).min(1).max(10),
}).strict().refine((body) => body.messages[body.messages.length - 1]?.role === "user", "The latest message must be from the user.");

export async function POST(request: Request) {
  const access = await adminApi(request, "ai");
  if ("error" in access) return access.error;
  const configuredLimit = Number(process.env.AI_RATE_LIMIT_PER_MINUTE);
  const perMinuteLimit = Number.isInteger(configuredLimit) && configuredLimit >= 1 && configuredLimit <= 60 ? configuredLimit : 12;
  if (rateLimited(request, "admin-ai", perMinuteLimit, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let raw: string;
  try {
    raw = await request.text();
    if (raw.length > 20_000) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const valid = RequestSchema.safeParse(parsed);
  if (!valid.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const { agentId, messages } = valid.data;
  if (!canUseAgent(access.session.role, agentId)) return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  const providerStatus = getAIProviderStatus();
  if (!providerStatus.enabled) return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });

  const userMessages = messages.filter((message) => message.role === "user").slice(-4).map((message) => message.content.trim()).filter(Boolean);
  const question = userMessages[userMessages.length - 1] ?? "";
  if (!question) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const toolQuery = userMessages.join("\n");
  const started = Date.now();
  const questionHash = createHash("sha256").update(question).digest("hex");

  try {
    const reports = await runAgentTools(agentId, access.session.role, toolQuery);
    const completion = await completeWithAI(adminAssistantPrompt(agentId, JSON.stringify(reports)), userMessages);
    await logAudit(
      { email: access.session.email, role: access.session.role },
      "AI_QUERY",
      "ai_agent",
      agentId,
      {
        questionHash,
        tools: reports.map((report) => report.tool),
        sources: reports.map((report) => report.source),
        provider: completion.provider,
        model: completion.model,
        fallbackUsed: completion.fallbackUsed,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        costUsdMicros: completion.costUsdMicros,
        latencyMs: completion.latencyMs,
        outcome: "success",
      },
      request,
      true,
    );
    return NextResponse.json({
      answer: completion.text,
      reports,
      provider: completion.provider,
      model: completion.model,
      usage: { inputTokens: completion.inputTokens, outputTokens: completion.outputTokens, costUsdMicros: completion.costUsdMicros, fallbackUsed: completion.fallbackUsed, latencyMs: completion.latencyMs },
    });
  } catch {
    const code = "provider_unavailable";
    await logAudit(
      { email: access.session.email, role: access.session.role },
      "AI_QUERY",
      "ai_agent",
      agentId,
      { questionHash, outcome: "failed", code, durationMs: Date.now() - started },
      request,
      true,
    );
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}