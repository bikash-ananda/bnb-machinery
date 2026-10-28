import "server-only";

import { estimateCostUsdMicros } from "@/lib/ai/math";

export type AIProvider = "openai" | "deepseek" | "anthropic" | "openai-compatible";
type ProviderConfig = { provider: AIProvider; model: string; baseUrl: string; apiKey: string; local: boolean };
export type CompletionUsage = { inputTokens: number | null; outputTokens: number | null; costUsdMicros: number | null };
export type CompletionResult = CompletionUsage & { text: string; provider: AIProvider; model: string; fallbackUsed: boolean; latencyMs: number };

const DEFAULT_BASE_URL: Record<AIProvider, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  "openai-compatible": "",
};

const acceptedProvider = (value: string | undefined): AIProvider | null =>
  value === "openai" || value === "deepseek" || value === "anthropic" || value === "openai-compatible" ? value : null;
const readRate = (key: string) => {
  const raw = process.env[key]?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function validatedBase(raw: string, local: boolean) {
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash) return null;
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && process.env.NODE_ENV !== "production" && isLoopback && url.protocol === "http:")) return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function configFromEnv(prefix: "AI" | "AI_FALLBACK"): ProviderConfig | null {
  const rawProvider = process.env[`${prefix}_PROVIDER`]?.trim().toLowerCase();
  const provider = acceptedProvider(rawProvider) ?? (prefix === "AI" && (process.env.OPENAI_API_KEY?.trim() || process.env.AI_API_KEY?.trim()) ? "openai" : null);
  if (!provider) return null;
  const model = (process.env[`${prefix}_MODEL`]?.trim() || (prefix === "AI" ? process.env.OPENAI_MODEL?.trim() : "") || "").slice(0, 160);
  if (!model) return null;
  const requestedBase = process.env[`${prefix}_API_BASE_URL`]?.trim() || DEFAULT_BASE_URL[provider];
  if (!requestedBase) return null;
  const local = provider === "openai-compatible";
  const baseUrl = validatedBase(requestedBase, local);
  if (!baseUrl) return null;
  const providerKey = provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : undefined;
  const apiKey = process.env[`${prefix}_API_KEY`]?.trim() || (prefix === "AI" ? process.env.AI_API_KEY?.trim() : "") || providerKey?.trim() || (prefix === "AI" && provider === "openai" ? process.env.OPENAI_API_KEY?.trim() : "") || "";
  const url = new URL(baseUrl);
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!apiKey && !(local && isLoopback && process.env.NODE_ENV !== "production")) return null;
  return { provider, model, baseUrl, apiKey, local: !apiKey };
}

export function getAIProviderStatus() {
  const primary = configFromEnv("AI");
  const fallback = configFromEnv("AI_FALLBACK");
  return {
    enabled: Boolean(primary),
    provider: primary?.provider ?? null,
    model: primary?.model ?? null,
    fallbackEnabled: Boolean(fallback),
    costTrackingEnabled: readRate("AI_INPUT_USD_PER_MILLION_TOKENS") !== null && readRate("AI_OUTPUT_USD_PER_MILLION_TOKENS") !== null && (!fallback || (readRate("AI_FALLBACK_INPUT_USD_PER_MILLION_TOKENS") !== null && readRate("AI_FALLBACK_OUTPUT_USD_PER_MILLION_TOKENS") !== null)),
  };
}

function parseUsage(value: unknown) {
  if (!value || typeof value !== "object") return { inputTokens: null, outputTokens: null };
  const usage = value as Record<string, unknown>;
  const rawInput = usage.input_tokens ?? usage.prompt_tokens;
  const input = rawInput == null ? Number.NaN : Number(rawInput);
  const rawOutput = usage.output_tokens ?? usage.completion_tokens;
  const output = rawOutput == null ? Number.NaN : Number(rawOutput);
  return {
    inputTokens: Number.isSafeInteger(input) && input >= 0 ? input : null,
    outputTokens: Number.isSafeInteger(output) && output >= 0 ? output : null,
  };
}

function responseText(body: Record<string, unknown>, provider: AIProvider) {
  if (provider === "openai") {
    if (typeof body.output_text === "string") return body.output_text.trim();
    const output = Array.isArray(body.output) ? body.output : [];
    return output.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((part) => part && typeof part === "object" && (part as Record<string, unknown>).type === "output_text" && typeof (part as Record<string, unknown>).text === "string" ? [(part as Record<string, unknown>).text as string] : []);
    }).join("\n").trim();
  }
  if (provider === "anthropic") {
    const content = Array.isArray(body.content) ? body.content : [];
    return content.flatMap((part) => part && typeof part === "object" && (part as Record<string, unknown>).type === "text" && typeof (part as Record<string, unknown>).text === "string" ? [(part as Record<string, unknown>).text as string] : []).join("\n").trim();
  }
  const choices = Array.isArray(body.choices) ? body.choices : [];
  const message = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>).message : null;
  const content = message && typeof message === "object" ? (message as Record<string, unknown>).content : null;
  return typeof content === "string" ? content.trim() : "";
}

async function callProvider(config: ProviderConfig, system: string, userMessages: string[], timeoutMs: number, maxOutputTokens: number, temperature: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers({ "content-type": "application/json" });
    let endpoint = "";
    let body: Record<string, unknown>;
    if (config.provider === "openai") {
      endpoint = `${config.baseUrl}/responses`;
      headers.set("authorization", `Bearer ${config.apiKey}`);
      body = { model: config.model, store: false, instructions: system, input: userMessages.join("\n\n"), max_output_tokens: maxOutputTokens };
    } else if (config.provider === "anthropic") {
      endpoint = `${config.baseUrl.endsWith("/v1") ? config.baseUrl : `${config.baseUrl}/v1`}/messages`;
      headers.set("x-api-key", config.apiKey);
      headers.set("anthropic-version", "2023-06-01");
      body = { model: config.model, max_tokens: maxOutputTokens, temperature, system, messages: userMessages.map((content) => ({ role: "user", content })) };
    } else {
      endpoint = `${config.baseUrl}/chat/completions`;
      if (config.apiKey) headers.set("authorization", `Bearer ${config.apiKey}`);
      body = { model: config.model, temperature, max_tokens: maxOutputTokens, messages: [{ role: "system", content: system }, ...userMessages.map((content) => ({ role: "user", content }))] };
    }

    const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store", signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error(`provider_http_${response.status}`);
    const json = await response.json() as Record<string, unknown>;
    const text = responseText(json, config.provider);
    if (!text) throw new Error("provider_empty_response");
    const usage = parseUsage(json.usage);
    return { text: text.slice(0, 4000), ...usage };
  } finally {
    clearTimeout(timeout);
  }
}

export async function completeWithAI(system: string, userMessages: string[]): Promise<CompletionResult> {
  const primary = configFromEnv("AI");
  if (!primary) throw new Error("ai_not_configured");
  const fallback = configFromEnv("AI_FALLBACK");
  const timeoutValue = Number(process.env.AI_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutValue) && timeoutValue >= 5000 ? Math.min(Math.floor(timeoutValue), 60000) : 30000;
  const outputValue = Number(process.env.AI_MAX_OUTPUT_TOKENS);
  const maxOutputTokens = Number.isInteger(outputValue) && outputValue >= 128 && outputValue <= 4096 ? outputValue : 900;
  const temperatureValue = Number(process.env.AI_TEMPERATURE);
  const temperature = Number.isFinite(temperatureValue) && temperatureValue >= 0 && temperatureValue <= 1 ? temperatureValue : 0.2;
  const started = Date.now();
  let usedFallback = false;
  let result: Awaited<ReturnType<typeof callProvider>>;
  let selected = primary;
  try {
    result = await callProvider(primary, system, userMessages, timeoutMs, maxOutputTokens, temperature);
  } catch (primaryError) {
    if (!fallback) throw primaryError;
    usedFallback = true;
    selected = fallback;
    result = await callProvider(fallback, system, userMessages, timeoutMs, maxOutputTokens, temperature);
  }
  const ratePrefix = usedFallback ? "AI_FALLBACK" : "AI";
  const inputRate = readRate(`${ratePrefix}_INPUT_USD_PER_MILLION_TOKENS`);
  const outputRate = readRate(`${ratePrefix}_OUTPUT_USD_PER_MILLION_TOKENS`);
  return {
    ...result,
    costUsdMicros: estimateCostUsdMicros(result.inputTokens, result.outputTokens, inputRate, outputRate),
    provider: selected.provider,
    model: selected.model,
    fallbackUsed: usedFallback,
    latencyMs: Date.now() - started,
  };
}