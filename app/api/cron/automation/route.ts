import { timingSafeEqual } from "node:crypto";
import { runAutomationCycle } from "@/src/modules/automation/engine";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.AUTOMATION_CRON_SECRET?.trim();
  const candidate = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!expected || expected.length < 32 || !candidate || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Not authorized." }, { status: 401 });
  try {
    return Response.json({ ok: true, ...(await runAutomationCycle()) });
  } catch (error) {
    console.error("scheduled automation cycle failed", error);
    return Response.json({ error: "Automation cycle failed." }, { status: 503 });
  }
}
