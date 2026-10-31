# Implementation status

Updated: 2026-10-31

## Current architecture and deployment

The production application is self-hosted on the Contabo VPS. PostgreSQL 16 is the authoritative application database, accessed through Drizzle ORM. Redis supports background automation, and uploaded media uses persistent VPS storage. The web application runs in Docker Compose behind the existing shared Caddy reverse proxy.

The PostgreSQL-backed release is deployed. The migration service completed successfully, and the web, PostgreSQL, Redis and automation containers were reported healthy. Local VPS health endpoint returned HTTP 200. The public canonical www health endpoint still requires a final check.

## Data availability

The checked legacy hosted tables for products, categories, brands, product images and orders each returned zero rows. The corresponding production PostgreSQL business tables also returned zero rows at the time of inspection. Customers, suppliers, quotations and invoices were not found under the queried legacy table names. No catalog/order import was available from those checked tables.

An empty catalog is a data-availability issue, not proof that application workflows are working. Staff product creation, owner review, approval, publishing, public browsing and order creation still require end-to-end acceptance tests.

## Implemented platform foundation

- PostgreSQL and Drizzle are the application data layer.
- Staff/admin authentication, OTP records, sessions and audit events use PostgreSQL.
- Inventory workflow records use PostgreSQL.
- Uploaded inventory images use persistent local media storage.
- Orders and other supported business workflows persist through PostgreSQL.
- Database migrations are applied through the deployment migration service.
- The automation runner uses the deployed application configuration and reports its execution status.

## AI assistant

The protected `/admin/ai` workspace provides role-scoped Business, Sales, Inventory, Purchasing and Accounting agents. They use read-only server tools over available business records. They cannot place orders, change stock or prices, post accounting entries, issue refunds or send messages.

Provider credentials remain server-side. See [AI agent architecture](AI_AGENT_ARCHITECTURE.md) for data boundaries, role matrix and known reporting limits.

## Known follow-up work

- Remove obsolete environment/configuration references and verify no legacy database SDK, endpoint or runtime variable remains.
- Investigate and fix the Next.js prerender cache warning: the web process reported an ENOENT while attempting to create `/app/.next/server/route-cache`.
- Complete browser acceptance tests for staff authentication, draft creation, image upload/read, owner review, approval, publication, product browsing and order submission.
- Populate the catalog only with verified B & B Machinery product, brand, category, price and stock information.
- Complete remaining catalog, CMS, inventory, purchasing, billing, customer portal and ERP roadmap items.
- Verify the public canonical domain health endpoint, robots.txt and sitemap.xml.

## Safety

Do not reset or delete the production database, named volumes, media, backups, or untracked files. Migrations must remain additive and must be reviewed before deployment. Do not modify unrelated sites or containers on the shared VPS.
