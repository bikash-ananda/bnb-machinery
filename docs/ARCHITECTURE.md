# Architecture

## 1. Goals
One server, one codebase, one database. Easy to extend without touching old files. Secure by default. Nepal-compliant billing.
Business can run if internet or a vendor fails: backups off-site, exports available, no vendor lock-in (Supabase is removed).

## 2. Topology (single Contabo VPS, Docker Compose)
```
Internet ──443──> Caddy (auto HTTPS, security headers, optional IP allowlist for admin.<domain>)
                    └─> web   (Next.js standalone: site, shop, admin console, API/webhooks)
                    └─> worker(Node + BullMQ: jobs, outbox dispatcher, PDF, notifications, AI replies)
                          ├─> postgres (16, internal network only)
                          ├─> redis    (queues, rate limits, sessions cache)
                          └─> /data volume (media, generated PDFs)  -- behind StorageAdapter
Nightly: pg_dump + media sync ──> off-site object storage (NOT only the server snapshot)
```
Only ports 22 (key-only), 80, 443 are open. Postgres/Redis are never exposed.
Sizing: 4 vCPU/8 GB is plenty for this load. Postgres ~1–2 GB RAM, web+worker ~2 GB, headroom for PDF rendering.

## 3. Stack (and why)
| Concern | Choice | Why |
|---|---|---|
| App | Next.js (existing) + TypeScript strict | Already built; one codebase for site + admin |
| DB | PostgreSQL 16 | Same engine as Supabase, so migration is a dump/restore |
| ORM/migrations | Drizzle ORM + drizzle-kit | SQL-first, typed, reviewable migrations |
| Validation | Zod | One schema for forms, API, env |
| Queue/jobs | BullMQ + Redis | Retries, schedules, delayed jobs (quote follow-ups) |
| Auth | Own implementation (Argon2id, TOTP, optional WebAuthn) | Full control, no vendor; see SECURITY.md |
| PDF/print | HTML templates -> print CSS (A4 + 80mm) -> PDF via headless Chromium in worker | One template = screen, print, PDF |
| Dates | AD in DB (timestamptz); BS computed by a util; Fiscal year Shrawan–Ashadh | Nepal invoices need BS |
| Storage | StorageAdapter (local disk now, S3/MinIO later) | Swap without code changes |
| Logs | pino JSON + Uptime Kuma (uptime) | Cheap, enough |
| Tests | Vitest (services) + Playwright (smoke) | Tax/stock logic must be tested |

## 4. Repository layout (target)
```
app/                   routing only: (site) public, (shop), admin/ (management console), api/ (webhooks, public JSON)
src/modules/<name>/    schema.ts service.ts actions.ts events.ts ui/   <- all domain code
  auth rbac audit settings cms catalog inventory purchasing customers sales(quotes,orders,invoices,payments)
  tax numbering documents notifications assistant reports
src/integrations/      whatsapp sms email esewa khalti ird-cbms ai storage   (each: interface + adapters)
src/lib/               money.ts dates-bs.ts events.ts outbox.ts ratelimit.ts crypto.ts logger.ts
src/env.ts             validated env
config/                site.ts nav.ts theme.ts features.ts numbering.ts tax.defaults.ts
locales/               en.json ne.json
db/migrations/         generated SQL (committed)
infra/                 compose, Caddy, Dockerfile, scripts
docs/                  this folder
```
Rule: a module may import another module's `service` and `events` only (never its tables). Cross-module effects use events.

## 5. Patterns that remove repeated edits
1. **Config over code.** Company profile, nav, theme, features, numbering formats, tax defaults -> `config/` + `settings` table (editable in admin).
2. **CMS blocks.** Public pages = ordered JSON blocks (hero, product-grid, text, gallery, faq, cta). New page = admin action, no deploy.
3. **i18n keys.** All text in `locales/*.json`; adding a language = adding a file.
4. **Domain events + outbox.** `order.placed`, `invoice.issued`, `stock.low`, `quote.sent`, `payment.received`, `message.inbound`.
   Handlers subscribe in `events.ts` of any module. Outbox table guarantees at-least-once delivery after commit.
5. **Adapters.** Switch eSewa/Khalti/WhatsApp/AI provider by env + adapter, not by rewriting callers.
6. **Generators.** `/new-module` slash command scaffolds a module from the template so structure stays uniform.
7. **Permissions as data.** `permissions` matrix (role x action). New feature = new permission key.

## 6. Core flows
- **Web order:** cart -> `sales.createOrder` (prices re-read server-side) -> stock *reserved* -> staff confirms -> invoice issued -> stock *deducted* -> receipt/payment recorded.
- **Quote request:** website quote list or chat -> draft quote auto-priced from price list + margin rules -> staff approves (or auto-send under a limit) -> PDF emailed/WhatsApped -> follow-ups at +2d/+5d -> expires -> accepted -> converts to order.
- **Low stock:** movement posted -> balance below reorder point -> `stock.low` -> purchasing suggests PO per preferred supplier -> alert to manager.
- **Customer message:** inbound WhatsApp/email/web chat -> `assistant` answers from catalog + policies, creates quote/lead, or hands off to a human with full context.
- **Invoice:** `sales.issueInvoice` locks lines, takes next number, computes taxes via `tax`, renders print/PDF, emits `invoice.issued` (stock deduct, ledger, CBMS adapter if enabled).

## 7. Environments
Dev: `pnpm dev` + dev compose (Postgres+Redis). Staging optional (second compose project on the same VPS, different subdomain).
Prod: `infra/docker-compose.yml`. Releases: build image -> `db:migrate` -> swap containers -> health check -> keep previous image for rollback. Take a Contabo snapshot before major upgrades.

## 8. Decision log
ADR-1 Self-host Postgres (cost, control). ADR-2 Modular monolith, not microservices (one small team). ADR-3 Money as integer paisa.
ADR-4 Append-only stock ledger. ADR-5 Own auth with mandatory 2FA. ADR-6 Billing generates Rule-17 tax invoices; CBMS sync is an optional adapter (see TAX-NEPAL.md).
