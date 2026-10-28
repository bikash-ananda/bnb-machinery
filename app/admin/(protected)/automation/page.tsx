import AutomationConsole from "@/components/admin/AutomationConsole";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getAutomationActivity, getAutomationMetrics, listAutomationRules } from "@/src/modules/automation/engine";

export const metadata = { title: "Automation center" };

export default async function AutomationPage() {
  await requireAdmin("automation");

  const data = await Promise.all([
    listAutomationRules(),
    getAutomationMetrics(),
    getAutomationActivity(),
  ]).then(([rules, metrics, activity]) => ({ rules, metrics, activity })).catch(() => null);

  if (!data) {
    return <AutomationConsole databaseReady={false} rules={[]} metrics={null} activity={{ events: [], messages: [] }} />;
  }

  return <AutomationConsole
    databaseReady
    rules={data.rules.map((rule) => ({
      code: rule.code,
      area: rule.area,
      name: rule.name,
      description: rule.description,
      trigger: rule.trigger,
      enabled: rule.enabled,
    }))}
    metrics={data.metrics}
    activity={data.activity}
  />;
}
