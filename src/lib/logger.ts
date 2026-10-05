import pino from "pino";

/** JSON logs. Secrets are redacted. Use logger.info({ orderNo }, "order placed"). Never log request bodies with passwords. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: { paths: ["password", "token", "secret", "*.password", "*.token", "*.secret", "req.headers.authorization", "req.headers.cookie"], censor: "[redacted]" },
});
