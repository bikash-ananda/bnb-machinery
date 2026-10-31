# Roadmap — tick boxes as work is completed

## Phase 0 — Foundation
- [x] 0.1 Next.js standalone output, environment validation, shared utilities and tests
- [x] 0.2a Shared configuration, English/Nepali locales and translation helpers
- [ ] 0.2b Move remaining inline bilingual strings into locale keys
- [x] 0.3 PostgreSQL + Redis, Drizzle setup, database scripts and CI
- [x] 0.4 Production Dockerfile, Compose deployment and shared Caddy routing

## Phase 1 — Self-hosted PostgreSQL platform
- [x] 1.1 PostgreSQL/Drizzle schema for application data
- [x] 1.2 Review legacy data availability; no catalog or order rows were present in the checked legacy tables, so no data import was required
- [x] 1.3 Replace hosted database, auth and storage runtime paths with PostgreSQL-backed services and persistent VPS media storage
- [x] 1.4 PostgreSQL-backed staff/admin authentication, sessions and audit records
- [x] 1.5 Deploy the PostgreSQL-backed application to the production VPS
- [ ] 1.6 Final cleanup of obsolete environment variables and documentation; verify no legacy SDK, endpoint or configuration remains

## Phase 2 — Catalog, CMS and shop
- [ ] 2.1 Catalog module: categories, brands, products, media, specifications, units and price lists; admin CRUD and safe CSV import
- [ ] 2.2 CMS settings, page blocks, menus and content management
- [ ] 2.3 Public catalog search, filtering, compare, saved items and SEO
- [ ] 2.4 Customer accounts and order history

## Phase 3 — Inventory and purchasing
- [ ] 3.1 Stock locations, append-only ledger and balances
- [ ] 3.2 Receive, adjust, transfer, count, serial/batch and valuation workflows
- [ ] 3.3 Reorder rules and stock dashboards
- [ ] 3.4 Suppliers, purchase orders, goods receipts and supplier bills

## Phase 4 — Sales, tax and billing
- [ ] 4.1 Tax configuration, fiscal years, numbering and Nepali date support
- [ ] 4.2 Quotations, pricing, PDF generation, sending and order conversion
- [ ] 4.3 Orders, checkout, reservations and counter sales
- [ ] 4.4 Invoices, print layouts, PDFs and credit/debit notes
- [ ] 4.5 Payments, receipts and customer ledger
- [ ] 4.6 Sales, purchase, VAT and stock reports

## Phase 5 — Automation and channels
- [ ] 5.1 Outbox and background event handlers
- [ ] 5.2 Email/SMS notifications and localized templates
- [ ] 5.3 Website assistant with human handoff
- [ ] 5.4 WhatsApp Business integration
- [ ] 5.5 Order status and warranty notifications

## Phase 6 — Payments, compliance and launch
- [ ] 6.1 eSewa and Khalti adapters with verified webhooks
- [ ] 6.2 Optional IRD-CBMS adapter if required by the business
- [ ] 6.3 Security review, load test and backup/restore drill
- [ ] 6.4 Production acceptance and launch checklist

## Acceptance criteria

A feature is complete only when it works end-to-end, tests pass, permissions and audit behavior are verified, Nepali translations are present, and documentation is updated.
