# Implementation status

Updated: 2026-11-27  
Audit baseline: `main` commit `2fa9b9e18fa7a750f707ef628d2caa454625bf6e`  
Working phase branch: `feat/phase-1-company-master`

## Phase 0 — Repository audit

The audit inspected the repository tree, public routes, API routes, Drizzle schema modules, migration journal, locale files, deployment guide and available CI workflows.

### Verified existing foundations

- Next.js App Router, TypeScript, React and Tailwind.
- PostgreSQL 16 and Drizzle ORM with migrations `0000`–`0009`.
- Redis and a background automation runner.
- Catalog, inventory, customer, sales, purchasing, accounting, automation and support schema modules.
- Public pages for Home, About, Products, Product Details, Brands, Services, Gallery, Contact, Quote Request and Location.
- Admin workspaces for catalog, inventory, orders, POS, procurement, billing, customers, analytics, audit, users, automation and AI.
- Public quote-request API and protected quotation inbox API.
- Public chat/support API with persistent conversation and message records.
- English and Nepali locale dictionaries and translation helper.
- CI workflows that run typecheck, lint, unit tests and production build for pull requests to `main`.

Repository implementation does not prove that every workflow has passed browser acceptance or is correctly configured in the live production environment.

### Phase 0 findings requiring action

1. `config/site.ts` used the unconfirmed public name “Machinery Tools Nepal” instead of B & B Machinery.
2. The same file contained a TikTok URL that has not been confirmed as the official business account. It has been cleared pending owner verification. Facebook remains empty.
3. `lib/server/catalog.ts` appended hardcoded local examples and manufacturer/market research products to the public catalog even when they were not B & B approved stock records. The phase branch removes that static fallback. Public listings now come from the existing approved/published PostgreSQL catalog paths.
4. The canonical public and registered business names must remain distinct: public name “B & B Machinery”; registration certificate name “B And B Machinery Suppliers”.
5. The uploaded PAN certificate name appears different from the firm registration certificate. PAN ownership is on hold until verified by the owner/accountant; no PAN number or personal identifier is copied into public configuration.
6. The current company profile is still a TypeScript configuration object, not yet an owner-editable company master record in PostgreSQL.
7. Product model, part number, application, detailed specifications, product document library, price history and warehouse/branch relationships require schema-by-schema verification before adding new migrations.
8. `docs/IMPLEMENTATION_STATUS.md` previously reflected an October 31 deployment report. Live production health, current migration state, backups and public-domain SEO endpoints must be rechecked before any release.

## Operating model decision — one branch

B & B Machinery will operate with one business branch/location for the current scope. Do not build multi-branch management, branch transfers, branch-level financial books or branch selection into current workflows. Keep the existing stock-location ledger for the shop/store and internal storage zones only. Use one default stock location unless the owner later asks for separate internal locations. Future expansion may be designed as an optional extension, but must not complicate today's single-location operation.

## Phase 1 — Company and master-data foundation

### Completed in working branch

- Corrected public and legal business names in `config/site.ts`.
- Kept official social URLs empty until verified.
- Removed unverified static/example product fallback from the public catalog service.

### Remaining

- Audit actual deployed schema against the current migration journal.
- Add an additive company profile/settings model only after checking for existing equivalent structures.
- Keep public name, registered firm name, shop address, registration address, contacts, service areas, locale and social links as separate fields.
- Add controlled owner/admin editing and append-only audit history.
- Add private legal-document metadata and verification state; keep scans and identifiers private.
- Verify catalog master fields, media/document relations, price history, product model/part number and category/brand relations.
- Reconcile the legacy staff inventory workflow with the canonical catalog without deleting source records.
- Add safe import/export and backup/restore runbooks.

## Phase 2 — Catalog and product publishing

- Verify product create/edit, image upload/read, owner review, approve/reject and publication.
- Add multiple images, media ordering, brochures/manuals and product document visibility.
- Verify search, brand/category filters, model/part number and product detail SEO.
- Support fixed price and Price on Request with server-side price revalidation.
- Only owner-verified B & B product, brand, price and availability data may be published.

## Phase 3 — Inventory and procurement

- Verify append-only stock movement posting and derived balances.
- Complete stock in/out, transfer, adjustment, reservation/release, stock count and low-stock rules.
- Verify supplier records, purchase orders, goods receipts, supplier bills and supplier payments.
- Add serial/batch/warranty tracking only where business processes require it.

## Phase 4 — Sales, quotation and accounting

- Verify web orders and POS from creation through fulfilment and invoice.
- Complete quotation lifecycle and conversion to order.
- Verify payments, receipts, customer/supplier balances, credit/debit notes and immutable issued documents.
- Validate fiscal-year and Nepal tax treatment against the owner's accountant and current official requirements before enabling production tax behavior.
- Reconcile journal postings and produce trial balance, profit/loss, balance sheet and cash/bank reports only when source data supports them.

## Phase 5 — Customer portal and commerce

- Customer identity and secure account recovery.
- Cart persistence, server-side price/stock validation and safe checkout.
- Order history, quote history, delivery status and customer support handoff.
- Payment integration only after merchant accounts, settlement flow and callback verification are supplied.

## Phase 6 — Service and machinery support

- Service request intake, equipment identification, job assignment, work status and parts used.
- Warranty records and service history where verified.
- Rental request module only if B & B confirms that machinery rental is offered.

## Phase 7 — CMS, multilingual UX and public website

- Owner-managed pages, navigation, media and notices.
- Complete English/Nepali coverage and locale-aware metadata.
- Responsive mobile navigation and contact actions.
- Remove or noindex any unverified brand, product or SEO landing pages.
- Verify accessibility, performance, canonical URLs, structured data, robots and sitemap.

## Phase 8 — Customer AI assistant and integrations

- Ground answers only in approved catalog, service and company data.
- Product discovery, machinery selection guidance, spare-part/service inquiry and quote creation.
- Explicit human handoff and privacy/retention controls.
- Add messaging, ERP and other integrations through replaceable server-side adapters.
- Keep mutating AI actions behind explicit staff approval and audit.

## Phase 9 — Production readiness and launch

- Browser acceptance tests for all critical user and staff workflows.
- Typecheck, lint, unit tests, database smoke tests and production build.
- Verify health, domain redirects, TLS, robots, sitemap, logs and error monitoring.
- Verify off-site PostgreSQL and media backups and test restore into an isolated environment.
- Deploy only after backup and review; never reset or drop production data.

## Production safety

- Do not run destructive database operations or delete volumes/media/backups.
- Do not overwrite `infra/.env.production` or expose secrets.
- Do not start the bundled Caddy profile or alter shared VPS services.
- Keep migrations additive and review the SQL before production execution.
- A branch/CI pass is not a production deployment or browser acceptance sign-off.

## Phase 0 — CI build correction (2026-11-27)

The first CI run for PR #11 passed TypeScript, ESLint (warnings only), and all 105 unit tests, but the production build failed while prerendering `/brands` and `/sitemap.xml`. Both paths read PostgreSQL-backed catalog data during static generation, while the CI build has no production database connection.

The phase branch now marks the brands page and sitemap as request-rendered using `dynamic = "force-dynamic"`. This keeps database access at request time and avoids requiring production credentials during CI builds. The canonical catalog fallback label was also changed from an unverified business name to the neutral `Unspecified brand`.

These changes have been committed to the existing phase branch. A new CI run must verify the fix; no production deployment or database operation was performed.


## Phase 1 — additive catalog master fields (2026-11-27)

Added explicit canonical catalog product part number and applications fields, indexed part-number search, and a product document metadata table. Documents default to PRIVATE and retain storage paths; no public document-serving endpoint is introduced in this migration. Existing inventory workflow fields are preserved. Migration `0010_product_part_numbers_documents` is additive and has not been applied to production.


## Phase 1 — CI follow-up (2026-11-27)

The homepage is now request-rendered with `dynamic = "force-dynamic"` because it reads the live PostgreSQL catalogue. The latest PR head `2d4974d08b9c7b6ce2db95275a271af05d78e071` has two completed GitHub Actions checks, both successful: `Typecheck, lint, tests and build` and `Typecheck, lint, tests and production build`. Additional catalog validation tests cover part numbers and application lists. This is CI verification only; no production migration, merge or deployment was performed.
