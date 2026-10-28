# Implementation status

Updated: 2026-10-28

## Current focus: AI assistant and customer-support build

The build is in progress. It includes a source-grounded, read-only admin AI assistant and the first local customer-support and quotation workflow. Deployment is deliberately deferred; this does not complete every ERP or AI roadmap item in the master prompt.

## Additional implementation on the approved feature branch

- Public quotation requests and website chat turns are persisted in the project's local PostgreSQL schema. Quote submissions use request IDs for retry safety, retain requested quantity and catalog identity, and do not accept browser-supplied prices or stock claims.
- Guest chat access uses a random, HttpOnly cookie; PostgreSQL stores only its SHA-256 hash. Staff can review transcripts, assign and resolve conversations, and send an authenticated reply. The website widget retrieves only the conversation bound to its cookie and polls while open for staff replies.
- The existing catalog search now supplies up to three structured product cards to AI chat, each linked to the product page and a prefilled quote form. Product facts come from the shared shop catalog; the language model does not set card prices.
- Customer chat uses the existing server-side configurable provider adapter, including its single fallback provider and bounded timeout/output settings. It records provider/model, latency, fallback use, token counts and estimated cost metadata with each saved AI reply when the provider supplies usage data.
- Website chat supports English, Nepali and Hindi selection, with Hindi voice requests where the selected speech service supports it.
- Resolved or closed support records are eligible for deletion after the configured retention period; the existing authenticated automation endpoint runs this cleanup.

## Migration and operational status

- Drizzle migrations `0006_natural_ultragirl.sql` and `0007_dapper_komodo.sql` are prepared but have not been applied. Migration `0006` also creates local workflow/admin tables that are already present in the application schema; their state on the live VPS is unknown. Inspect a backup and the live schema through an authorized read-only route before applying either migration, then rehearse on an isolated copy.
- A push to `main` starts `.github/workflows/deploy-production.yml`; its deployment script runs the project's `migrate` service before replacing the web application. Verify the live database migration state before pushing.
- No database, server, DNS, reverse proxy, firewall, container, or production environment was contacted or modified. No deployment, commit, or push was performed.
- Existing legacy admin-auth and other application paths still contain Supabase calls. Full Supabase removal and data migration remain blocked on a safe inventory of its schema, auth, storage, functions and secrets, plus an authorized Contabo schema inspection.
- WhatsApp, external email/notification delivery, secure document upload and ingestion, formal quotation approval/PDF, live staff notifications, and full ERP module completion are not implemented by this slice. No external provider is represented as connected.

## Implemented

- Protected `/admin/ai` workspace and `/api/admin/ai` endpoint, using existing admin sessions, module RBAC, same-origin checks and request rate limiting.
- Five role-controlled agents: Business, Sales, Inventory, Purchasing and Accounting.
- Fixed server-owned read tools for issued invoices, top-selling items, low-stock thresholds, stock movement, slow movers, recent posted supplier prices, journal summaries and receivable/payable control balances.
- Deterministic NPR paisa and quantity calculations, Nepal-local reporting windows, source labels, bounded row reads and fail-closed reports when a source cannot be read safely.
- Provider adapter for OpenAI Responses, Anthropic Messages, DeepSeek/OpenAI-compatible Chat Completions, with a single configured fallback, bounded timeout/output settings, optional token-cost estimates and server-only credentials.
- AI query audit records with actor, role, selected agent, source/tool names, provider/model, usage, latency, outcome and a one-way hash of the latest question. Successful responses require the audit write to succeed. Raw chat content is not stored by the application.
- Read-only UI with source cards, explicit limits, provider status and per-response usage. The existing public customer chatbot remains separate.
- Architecture documentation, environment examples and unit tests for permissions, date windows and deterministic arithmetic.

## Follow-on AI work

- Customer Support, Ecommerce SEO and Marketing agents are not implemented. Their data sources and approval flows need to be designed against the service, product SEO and campaign modules.
- No MCP server or DeepSeek Harness runtime is integrated. The current fixed tool registry is internal to the Next.js server.
- No approval workflow or AI-generated purchase draft/publishing workflow exists. The current agents cannot perform mutations.
- Provider enablement and settings are configured through server environment variables; there is no provider administration page, persisted conversation history or separate usage dashboard.
- Predictive stock forecasting, seasonal demand, customer purchasing patterns, unusual-transaction analysis and reorder-quantity recommendations are not claimed. The current tools report recorded facts and configured threshold gaps.

## Data limits

- Historical product profit is unavailable because invoice items do not snapshot cost at sale.
- The accounting schema has no due dates, so balances cannot be labeled overdue or exposed as customer-level aging.
- Supplier comparison uses recent posted bill unit prices and excludes landed-cost allocation.
- Ledger cash/bank/wallet figures are not bank reconciliations; reorder gaps are not purchase recommendations.
- Queries fail closed above 50,000 rows. Per-process IP rate limiting is not a shared quota across servers.
- Provider retention behavior depends on the configured provider account and its policy.

## Verification status

- Latest local checks on 2026-10-28: TypeScript `tsc --noEmit --incremental false` passed; Vitest passed 16 files / 85 tests; ESLint passed on the changed support, chat and admin files.
- `git diff --check` passed after the current support-reply and product-card edits.
- No isolated PostgreSQL migration rehearsal or end-to-end browser acceptance test has run. A production build was not run because Next.js may load the repository's private `.env.local` configuration; the database target has not been verified as isolated.

## Deployment

No deployment configuration was changed, no production services were contacted, and no deployment was performed. Before enabling the AI provider, configure server-side credentials and review the provider's data-retention terms. Restore dependencies, run the test/typecheck/lint/build checks, then validate against a non-production database and provider account.
