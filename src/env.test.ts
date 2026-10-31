import { describe, expect, it } from "vitest";
import { parseEnv } from "@/src/env";

describe("env", () => {
  it("accepts an empty dev environment and treats empty strings as unset", () => {
    const e = parseEnv({ OPENAI_API_KEY: "" });
    expect(e.NODE_ENV).toBe("development");
    expect(e.MEDIA_DIR).toBe("./data/media");
  });

  it("requires APP_ORIGIN in production", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(/APP_ORIGIN/);
    expect(parseEnv({ NODE_ENV: "production", APP_ORIGIN: "https://example.com" }).APP_ORIGIN).toBe("https://example.com");
  });

  it("rejects short secrets and bad URLs with readable messages", () => {
    expect(() => parseEnv({ SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
    expect(() => parseEnv({ APP_ORIGIN: "not a url" })).toThrow(/APP_ORIGIN/);
  });
});
