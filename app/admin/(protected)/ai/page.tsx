import AIWorkbench from "@/components/admin/AIWorkbench";
import { availableAgents } from "@/lib/ai/agents";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getAIProviderStatus } from "@/lib/server/ai-agent/providers";

export const metadata = { title: "AI business assistant" };

export default async function AIAdminPage() {
  const session = await requireAdmin("ai");
  return <AIWorkbench agents={availableAgents(session.role).map(({ id, name, description, prompts }) => ({ id, name, description, prompts }))} provider={getAIProviderStatus()} />;
}