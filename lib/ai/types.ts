import type { AgentToolId } from "@/lib/ai/agents";

export type Metric = { label: string; value: string; detail?: string };
export type ReportTable = { headings: string[]; rows: string[][] };
export type AgentReport = { tool: AgentToolId; title: string; period?: string; source: string; metrics: Metric[]; table?: ReportTable; notes?: string[]; status?: "available" | "unavailable" };
export type ProviderStatus = { enabled: boolean; provider: string | null; model: string | null; fallbackEnabled: boolean; costTrackingEnabled: boolean };