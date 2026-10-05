# Security design ("highly secure" = layers, not one trick)

## Authentication (management console)
- Passwords: Argon2id, min 12 chars, breached-password check (k-anonymity), no composition theatre.
- **2FA mandatory for every staff account**: TOTP (secret encrypted at rest with `TOTP_ENC_KEY`), 10 single-use recovery codes. Optional passkeys (WebAuthn) as a second factor.
- Sessions: random 256-bit token, only its hash stored; cookie `HttpOnly; Secure; SameSite=Strict`, `__Host-` prefix; idle timeout 30 min, absolute 12 h; revoke all on password change; list/revoke devices.
- Brute force: per-account + per-IP limits in Redis, progressive delay, temporary lockout, generic error messages, alert owner on lockout/new device.
- Re-authentication (password + 2FA) required for sensitive actions: change price lists, void/cancel invoice, change roles, export customer data, change tax codes.
- Admin on its own host `admin.<domain>`; optional IP allowlist at Caddy; no admin links on the public site.
- No default accounts. First owner created by a one-time CLI command (`pnpm admin:create`).

## Authorization
RBAC (Owner, Manager, Accountant, Sales, Stock clerk, Viewer). Permissions are checked in **service functions**, not only in UI. Deny by default.
Every admin write goes to `audit_log` (who, what, before/after, IP). Audit rows are append-only (DB role cannot UPDATE/DELETE them).

## Web security
CSRF: same-origin checks + SameSite=Strict + per-form tokens on mutations. Strict CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors 'none'` on admin.
Zod on all inputs; parameterised queries only (Drizzle); output encoding; file uploads: type sniffing, size limits, randomised names, served from a separate path with `Content-Disposition`.
Rate limits on checkout, quote, chat, login, OTP, search. Bot protection (Cloudflare Turnstile) on public forms when abuse appears.
Webhooks (WhatsApp, eSewa, Khalti): verify signatures, idempotency keys, replay protection.

## Data
Prices and totals are always recomputed on the server. Secrets only in env/secret store, never in git, never logged. PII minimised; customer export/delete procedure documented.
Database: separate DB roles (app: no DDL; migrator: DDL; backup: read-only); Postgres not exposed; TLS inside Docker network not required, but no host port mapping.

## Server
SSH key-only, no root login, non-default sudo user; UFW (22/80/443); fail2ban; unattended security upgrades; Docker containers non-root, read-only FS where possible;
automatic OS patch window; Contabo snapshot before upgrades; time sync; log rotation.

## Backups & recovery
Nightly encrypted `pg_dump` + media sync to **off-site** storage; keep 14 daily + 8 weekly + 12 monthly; monthly restore drill on a scratch DB; document RTO/RPO (target RPO 24h, RTO 4h).
A snapshot on the same provider is a convenience, not a backup.

## Monitoring
Uptime Kuma (site, admin, DB health), error log review, alert on: repeated login failures, invoice voids, stock adjustments above threshold, failed backups, disk > 80%.

## Pre-launch checklist
Pen-test style self review (OWASP ASVS L2 as a guide), dependency audit (`pnpm audit`), secrets scan, restore drill passed, 2FA enforced, admin IP allowlist decided, accountant sign-off on invoice format.
