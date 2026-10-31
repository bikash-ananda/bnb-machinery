@AGENTS.md

# B & B Machinery — Website + E-commerce + ERP (Nepal)

This is a self-hosted Next.js business platform on the Contabo VPS: public website, e-commerce, billing, quotations, stock management, automation, customer replies and a secure management console. Everything is for Nepal (NPR, VAT, BS dates, Nepali + English).

Business facts and confirmed decisions: docs/PROJECT-FACTS.md — do not re-ask the owner for these.

## Read first
1. docs/HANDOFF.md
2. docs/ARCHITECTURE.md
3. docs/ROADMAP.md (choose the next incomplete task)
4. docs/DATA-MODEL.md
5. docs/TAX-NEPAL.md before billing/tax work
6. docs/SECURITY.md before auth/admin work
7. docs/AUTOMATION.md before automation work

## Stack and commands
Next.js App Router, TypeScript, PostgreSQL 16, Drizzle ORM, Redis and Docker Compose.
Use pnpm:
`pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`.
Local services: `docker compose -f infra/docker-compose.dev.yml up -d`.
Production deployment: docs/DEPLOY.md.

## Architecture rules
1. Domain code lives in `src/modules/<name>/`; pages compose modules.
2. Business constants live in `config/` or database settings.
3. UI text uses `t("key")` with matching keys in English and Nepali locale files.
4. Database access belongs in module services using Drizzle.
5. Money uses integer paisa (bigint); never use floats.
6. Tax logic belongs in `src/modules/tax` and uses effective-dated configuration.
7. Stock changes use append-only inventory movements; never update a quantity directly.
8. Issued invoices and credit notes are immutable.
9. External services (WhatsApp, SMS, email, payments, AI and storage) sit behind server-side adapters.
10. Automation uses domain events and the outbox.
11. Content pages should be manageable through the CMS architecture.
12. Validate input with Zod and validate environment at boot.

## Security
Use server-side sessions, role-based authorization, audit logs, rate limits and server-only secrets. Never commit secrets, print environment values, or expose credentials through `NEXT_PUBLIC_*` variables. Never read or display `.env*` files.

## Definition of done
Typecheck, lint, tests and production build pass; migrations are additive and reviewed; permissions and audit behavior are considered; Nepali strings are included; roadmap and handoff are updated. Ask before destructive production actions.

## Don'ts
No floats for money. No hardcoded tax. No direct stock quantity updates. No secrets in code. Do not change unrelated services or production projects.
