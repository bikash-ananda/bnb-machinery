@AGENTS.md

# B & B Machinery — Website + E-commerce + ERP (Nepal)

We are turning the current Next.js site (Supabase-backed) into a self-hosted, full business system on one Contabo VPS
(4 vCPU / 8 GB / 100 GB SSD): public website, e-commerce, billing and tax invoices, automatic quotations, stock management
with automation, automatic customer replies, and a highly secure management console. Everything is for Nepal (NPR, VAT, BS dates, Nepali + English).

Business facts (VAT status, turnover, hosting region, decisions): docs/PROJECT-FACTS.md — do not re-ask the owner for these.

## Read first (in this order)
1. docs/ARCHITECTURE.md  2. docs/ROADMAP.md (do the FIRST unchecked task only)  3. docs/DATA-MODEL.md
4. docs/TAX-NEPAL.md (before touching billing/tax)  5. docs/SECURITY.md (before touching auth/admin)  6. docs/AUTOMATION.md

## Commands (pnpm only)
pnpm dev | pnpm build | pnpm lint | pnpm typecheck | pnpm test | pnpm db:generate | pnpm db:migrate | pnpm db:seed
Local services: `docker compose -f infra/docker-compose.dev.yml up -d` (Postgres + Redis). Deploy: see docs/DEPLOY-CONTABO.md.

## "Change it in ONE place" rules (the point of this architecture)
1. Domain code lives in `src/modules/<name>/` (schema, service, actions, ui, events). Pages in `app/` only compose modules.
2. No business constants in code: company details, tax rates, numbering, nav, theme, feature flags live in `config/` or DB settings.
3. UI text only via `t("key")` with `locales/en.json` + `locales/ne.json`. Never inline bilingual strings.
4. DB access only inside module services (Drizzle). Never query from components or route handlers directly.
5. Money = integer paisa (bigint) via `src/lib/money.ts`. No floats. Rounding: half-up to 2 decimals at line level (see TAX doc).
6. Tax only via `src/modules/tax`. Never write `0.13` or `13` in code. Rates are effective-dated rows.
7. Stock changes ONLY via `inventory.postMovement()` (append-only ledger). Never UPDATE a quantity column.
8. Issued invoices / credit notes are immutable. Corrections = credit note + new invoice. Numbers are gapless per fiscal year.
9. External services (WhatsApp, SMS, email, eSewa, Khalti, IRD-CBMS, AI, storage) sit behind adapter interfaces in `src/integrations/`.
10. Automation = domain events + outbox (`src/lib/events.ts`). New automation = new handler file; do not edit the emitter.
11. Pages that are content (home, about, landing) are CMS blocks in DB, not hardcoded JSX.
12. Validate every input with Zod; validate env at boot (`src/env.ts`).

## Security (non-negotiable) — details in docs/SECURITY.md
Argon2id passwords, mandatory TOTP 2FA for all staff, server-side sessions (hashed token), RBAC checked in the service layer,
audit log for every write in admin, rate limits on all public POST routes, no secrets in git, never print or read `.env*` files.

## Definition of done (every task)
typecheck + lint + tests pass; migration included and reversible; permissions + audit considered; Nepali strings added;
ROADMAP checkbox ticked; docs updated if a rule changed. Small commits. Ask before destructive actions (drop, delete, force push, prod).

## Token discipline (keep sessions cheap)
Start by reading docs/HANDOFF.md, then only the docs the task needs. Use Grep/Glob and read file ranges, not whole files. Never read lockfiles, node_modules, .next.
Do not re-print files you edited. Run tests/lint quietly and show only failures (pipe long output to a file, read the tail). Prefer small diffs. Finish by rewriting docs/HANDOFF.md (<=15 lines).

## Don'ts
No floats for money. No hardcoded tax. No direct qty updates. No secrets in code. No Supabase calls in new code (we are removing it).
Do not guess Nepal tax law: put the assumption in docs/TAX-NEPAL.md "To verify" and make it configurable.
