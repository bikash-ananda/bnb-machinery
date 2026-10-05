# Roadmap — tick boxes as you go. Claude Code: do the FIRST unchecked task, then stop and report.

## Phase 0 — Foundation
- [x] 0.1 `output: "standalone"`, `src/env.ts` (zod), `src/lib/{money,dates-bs,logger}.ts`, Vitest (19 tests) — done
- [x] 0.2a `config/` (site, features, numbering, tax.defaults), `locales/` en+ne, `t()` + `useT()`, key-parity test — done
- [ ] 0.2b Migrate existing inline `tr(en, ne)` strings and `lib/i18n/messages.ts` to `locales/*.json` keys; move shared UI into `src/ui`; keep legacy imports working
- [ ] 0.3 Dev compose (Postgres+Redis), Drizzle setup, `pnpm db:*` scripts, CI (typecheck, lint, test)
- [ ] 0.4 Production Dockerfile + compose + Caddy from `infra/`, verify the CURRENT site boots in Docker locally

## Phase 1 — Leave Supabase, secure admin
- [ ] 1.1 Drizzle schema for existing tables (products, categories, brands, images, orders, staff) matching current Supabase data
- [ ] 1.2 Script `scripts/migrate-from-supabase.ts` (pg_dump restore + images export) with a dry-run and row-count report
- [ ] 1.3 Replace `lib/server/supabase.ts`, `inventory.ts`, `auth.ts` with Postgres-backed module services; delete Supabase code and env vars
- [ ] 1.4 New auth: users/roles/permissions/sessions, Argon2id, TOTP + recovery codes, lockout, audit log, `pnpm admin:create`
- [ ] 1.5 Admin console shell on `/admin` (move `/staff`), RBAC-guarded nav, audit viewer

## Phase 2 — Catalog, CMS, shop on new DB
- [ ] 2.1 Catalog module: categories, brands, products, media, specs, units, price lists (admin CRUD + bulk CSV import with preview)
- [ ] 2.2 CMS module: settings editor, page blocks renderer, menus; convert home/about/services to blocks
- [ ] 2.3 Public shop reads from catalog module (search, filters, compare, saved, SEO schema) — keep current UX
- [ ] 2.4 Customers module + accounts for web customers (optional login, order history)

## Phase 3 — Inventory & purchasing
- [ ] 3.1 Locations, ledger, balances, `postMovement` with concurrency tests
- [ ] 3.2 Stock admin: receive, adjust, transfer, counts, serial/batch, valuation
- [ ] 3.3 Reorder rules + `stock.low` + dashboards
- [ ] 3.4 Suppliers, purchase orders, goods receipts, supplier bills, auto-draft POs

## Phase 4 — Sales, tax, billing
- [ ] 4.1 Tax module + fiscal years + numbering + BS dates + amount-in-words (tests from TAX-NEPAL.md first)
- [ ] 4.2 Quotes: builder, auto-pricing, PDF, send, follow-up jobs, convert to order
- [ ] 4.3 Orders: web checkout -> order, reservations, counter sales (POS-style), statuses
- [ ] 4.4 Invoices: issue (immutable), print A4 + 80mm, PDF, reprint counter, credit/debit notes
- [ ] 4.5 Payments & receipts, customer ledger, aging
- [ ] 4.6 Reports: sales/purchase registers, VAT summary, stock valuation, exports to CSV/Excel

## Phase 5 — Automation & channels
- [ ] 5.1 Outbox + BullMQ worker + event handlers framework
- [ ] 5.2 Notifications module (email, SMS adapter, templates per locale)
- [ ] 5.3 Assistant: website chat on new backend with guardrails + handoff inbox
- [ ] 5.4 WhatsApp Business Cloud adapter (inbound webhook, templates, voice notes)
- [ ] 5.5 Quote auto-send rules, order status messages, warranty reminders

## Phase 6 — Payments, compliance, launch
- [ ] 6.1 eSewa + Khalti adapters (needs merchant credentials) with webhook verification
- [ ] 6.2 (OPTIONAL, skip unless IRD makes e-billing mandatory for B & B) `ird-cbms` adapter; owner confirmed not mandatory at ~NPR 5 crore turnover. Re-check each Shrawan
- [ ] 6.3 Security review pass (docs/SECURITY.md checklist), load test, backup + restore drill
- [ ] 6.4 Deploy to Contabo (docs/DEPLOY-CONTABO.md), DNS, HTTPS, monitoring, go-live checklist

## Acceptance for "done" on each phase
Feature works end-to-end in the browser, tests pass, permissions + audit in place, Nepali text present, docs updated.
