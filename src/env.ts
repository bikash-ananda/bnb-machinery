import { z } from "zod";

// Empty strings in .env files count as "not set".
const opt = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" ? undefined : v), s.optional());

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ORIGIN: opt(z.string().url()),
    DATABASE_URL: opt(z.string().url()), // required from Roadmap Phase 1
    REDIS_URL: opt(z.string()), // required from Roadmap Phase 5
    SESSION_SECRET: opt(z.string().min(32, "SESSION_SECRET must be at least 32 characters")),
    TOTP_ENC_KEY: opt(z.string().min(32, "TOTP_ENC_KEY must be at least 32 characters")),
    MEDIA_DIR: z.preprocess((v) => (v === "" ? undefined : v), z.string().default("./data/media")),
    // OpenAI (chat + voice)
    OPENAI_API_KEY: opt(z.string()),
    OPENAI_MODEL: opt(z.string()),
    OPENAI_STT_MODEL: opt(z.string()),
    OPENAI_TTS_MODEL: opt(z.string()),
    OPENAI_TTS_VOICE: opt(z.string()),
    // Admin AI provider abstraction (all credentials remain server-only).
    AI_PROVIDER: opt(z.enum(["openai", "deepseek", "anthropic", "openai-compatible"])),
    AI_MODEL: opt(z.string()),
    AI_API_KEY: opt(z.string()),
    AI_API_BASE_URL: opt(z.string().url()),
    AI_TIMEOUT_MS: opt(z.coerce.number().int().min(5000).max(60000)),
    AI_MAX_OUTPUT_TOKENS: opt(z.coerce.number().int().min(128).max(4096)),
    AI_TEMPERATURE: opt(z.coerce.number().min(0).max(1)),
    AI_RATE_LIMIT_PER_MINUTE: opt(z.coerce.number().int().min(1).max(60)),
    AI_FALLBACK_PROVIDER: opt(z.enum(["openai", "deepseek", "anthropic", "openai-compatible"])),
    AI_FALLBACK_MODEL: opt(z.string()),
    AI_FALLBACK_API_KEY: opt(z.string()),
    AI_FALLBACK_API_BASE_URL: opt(z.string().url()),
    AI_INPUT_USD_PER_MILLION_TOKENS: opt(z.coerce.number().nonnegative()),
    AI_OUTPUT_USD_PER_MILLION_TOKENS: opt(z.coerce.number().nonnegative()),
    AI_FALLBACK_INPUT_USD_PER_MILLION_TOKENS: opt(z.coerce.number().nonnegative()),
    AI_FALLBACK_OUTPUT_USD_PER_MILLION_TOKENS: opt(z.coerce.number().nonnegative()),
    SUPPORT_RETENTION_DAYS: opt(z.coerce.number().int().min(30).max(730)),
    DEEPSEEK_API_KEY: opt(z.string()),
    ANTHROPIC_API_KEY: opt(z.string()),
    // Email
    RESEND_API_KEY: opt(z.string()),
    OTP_FROM_EMAIL: opt(z.string()),
    OTP_HASH_SECRET: opt(z.string().min(32, "OTP_HASH_SECRET must be at least 32 characters")),
    OWNER_EMAIL: opt(z.string().email()),
    ORDER_NOTIFY_EMAIL: opt(z.string().email()),
    // Legacy (removed in Roadmap 1.3)
    SUPABASE_URL: opt(z.string().url()),
    SUPABASE_SERVICE_ROLE_KEY: opt(z.string()),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === "production" && !e.APP_ORIGIN) {
      ctx.addIssue({ code: "custom", path: ["APP_ORIGIN"], message: "APP_ORIGIN is required in production (your exact https address)" });
    }
  });

export type Env = z.infer<typeof schema>;

/** Pure and testable: validates a given environment object. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const r = schema.safeParse(source);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${lines}`);
  }
  return r.data;
}

let cached: Env | undefined;
/** Use in server code: const env = getEnv(). Fails fast with a readable message. */
export function getEnv(): Env {
  return (cached ??= parseEnv(process.env));
}
