import AutomationConsole from "@/components/admin/AutomationConsole";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getAutomationActivity, getAutomationMetrics, listAutomationRules } from "@/src/modules/automation/engine";

export const metadata = { title: "Automation center" };

export default async function AutomationPage() {
  await requireAdmin("automation");
  try {
    const [rules, metrics, activity] = await Promise.all([
      listAutomationRules(), getAutomationMetrics(), getAutomationActivity(),
    ]);
    return <AutomationConsole
      databaseReady
      rules={rules.map((rule) => ({ code: rule.code, area: rule.area, name: rule.name, description: rule.description, trigger: rule.trigger, enabled: rule.enabled }))}
      metrics={metrics}
      activity={activity}
    />;
  } catch {
    return <AutomationConsole databaseReady={false} rules={[]} metrics={null} activity={{ events: [], messages: [] }} />;
  }
}
