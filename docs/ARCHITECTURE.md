# Architecture

## 1. Goals
One server, one codebase, one PostgreSQL database. Easy to extend without touching unrelated modules. Secure by default. Nepal-ready billing.
Business data remains under the company's control: backups, exports and replaceable integration adapters are part of the design.

## 2. Topology (single Contabo VPS, Docker Compose)
```
Internet ──443──> existing host Caddy
                    └─> web   (Next.js standalone: site, shop, admin console, API/webhooks)
                    └─> automation runner (jobs, outbox dispatcher, notifications, AI replies)
                          ├─> postgres (16, internal network only; authoritative application database)
                          ├─> redis    (queues, rate limits, cache)
                          └─> /data volume (media, generated documents)
Nightly: pg_dump + media backup ──> off-site backup destination
```
PostgreSQL and Redis are not exposed publicly. The B&B Machinery web service binds to its configured loopback port behind the shared host reverse proxy.

## 3. Stack
| Concern | Choice | Why |
|---|---|---|
| App | Next.js + TypeScript strict | Existing site and business application |
| Database | PostgreSQL 16 | Self-hosted authoritative data store |
| ORM/migrations | Drizzle ORM + drizzle-kit | Typed, reviewable SQL migrations |
| Validation | Zod | Shared validation for forms, APIs and environment |
| Queue/jobs | BullMQ + Redis | Retries, schedules and background work |
| Auth | PostgreSQL-backed server sessions and role checks | Application-controlled authentication |
| PDF/print | HTML templates and print CSS; server-side PDF generation | Shared layouts for screen, print and PDF |
| Dates | AD in DB; BS computed by utility | Nepal business documents |
| Storage | Persistent local media volume behind storage service | Durable uploads on the VPS |
| Logs | Structured application logs | Operational diagnostics |
| Tests | Vitest and available integration checks | Verify business and security rules |

## 4. Repository layout
```
app/                   routing: public site, shop, staff/admin and API
src/modules/<name>/    schema, service, actions, events and UI
src/integrations/      email, payments, messaging, AI and storage adapters
src/lib/               money, dates, events, outbox, rate limits and logging
src/env.ts             validated environment
config/                site, navigation, theme, features and numbering
locales/               English and Nepali translations
db/migrations/         generated SQL migrations
infra/                 Compose, Dockerfile, scripts and deployment
docs/                  architecture and operating procedures
```
Database access belongs in server-side module services. Cross-module effects use domain events.

## 5. Patterns
1. **Config over code.** Company profile, navigation, theme, features, numbering and tax defaults live in configuration or database settings.
2. **CMS blocks.** Public content pages should be manageable through the CMS.
3. **i18n keys.** UI text lives in locale files; adding a language means adding a locale.
4. **Domain events + outbox.** Business events are persisted so background delivery can retry safely.
5. **Adapters.** Payment, messaging, AI and email providers sit behind replaceable interfaces.
6. **Permissions as data.** Role/action permissions are checked server-side.

## 6. Core flows
- **Web order:** cart -> server-side price validation -> order persistence -> stock reservation -> staff confirmation -> invoice and payment workflow.
- **Quote request:** website form/chat -> persisted request -> staff review -> quotation and customer follow-up.
- **Low stock:** stock movement -> balance/reorder evaluation -> purchasing alert.
- **Customer message:** web chat/email/messaging adapter -> grounded answer, quote lead or human handoff.
- **Invoice:** immutable issued document with configured numbering and tax calculations.

## 7. Environments
Dev: `pnpm dev` with local PostgreSQL and Redis Compose services.
Prod: `infra/docker-compose.yml`. Release flow: build image -> apply additive Drizzle migrations -> replace only this project's containers -> health check -> retain previous image for rollback.

## 8. Decision log
- Self-host PostgreSQL for control and predictable ownership.
- Modular monolith rather than microservices for the current team.
- Money stored as integer paisa.
- Stock changes recorded as auditable movements.
- Authentication and authorization enforced by server-side services.
- Nepal tax behavior must follow verified business requirements and current regulations.
