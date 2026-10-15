import { eq } from "drizzle-orm";
import { adminApi, fail } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { runAutomationCycle, retryFailedAutomations } from "@/src/modules/automation/engine";
import { automationRules } from "@/src/modules/automation/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await adminApi(request, "automation");
  if ("error" in guard) return guard.error;

  let body: { action?: unknown; code?: unknown; enabled?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid request."); }

  if (body.action === "toggle") {
    if (typeof body.code !== "string" || body.code.length > 80 || typeof body.enabled !== "boolean") return fail("Choose a valid workflow and status.");
    const [rule] = await db.update(automationRules).set({ enabled: body.enabled, updatedBy: guard.session.email, updatedAt: new Date() })
      .where(eq(automationRules.code, body.code)).returning({ code: automationRules.code, enabled: automationRules.enabled });
    if (!rule) return fail("Workflow not found.", 404);
    await logAudit(guard.session, "automation.rule", "automation_rule", rule.code, { enabled: rule.enabled }, request);
    return Response.json({ ok: true, rule });
  }

  if (body.action === "run") {
    try {
      const result = await runAutomationCycle();
      await logAudit(guard.session, "automation.run", "automation", "commerce-automation", result, request);
      return Response.json({ ok: true, result });
    } catch (error) {
      console.error("manual automation run failed", error);
      return fail("The automation cycle could not complete. Check the automation status and server logs.", 503);
    }
  }

  if (body.action === "retry_failed") {
    try {
      const result = await retryFailedAutomations();
      await logAudit(guard.session, "automation.retry", "automation", "failed-items", result, request);
      return Response.json({ ok: true, result });
    } catch (error) {
      console.error("automation retry failed", error);
      return fail("Could not retry failed automation items.", 503);
    }
  }

  return fail("Unknown automation action.");
}
