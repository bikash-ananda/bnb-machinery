# Handoff

Done: Production application uses PostgreSQL + Drizzle, Redis and persistent VPS media storage. Legacy hosted database/auth/storage runtime paths have been replaced.
Deployment: PR #9 was merged to main and the PostgreSQL-backed release was deployed to the Contabo VPS. Drizzle migrations completed successfully.
Data check: The checked legacy products, categories, brands, images and orders tables contained zero rows; the corresponding production catalog/order tables are also empty.
Next: Finish obsolete environment/documentation cleanup, fix and verify the Next.js prerender route-cache write error, then test staff draft → owner review → publish end-to-end.
Safety: Never delete volumes, reset databases, drop/truncate tables, or touch unrelated VPS projects. Preserve backups and untracked files.
Architecture: Next.js + TypeScript, PostgreSQL 16 + Drizzle, Redis, Docker Compose and persistent media volume.
Commands: pnpm typecheck && pnpm lint && pnpm test && pnpm build
