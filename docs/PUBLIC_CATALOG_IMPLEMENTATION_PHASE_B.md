# Public infrastructure adapters — Phase B

This branch adds isolated server-side adapters. It does not enable them or change the existing private database/media runtime.

## Neon

- lib/server/public-catalog/neon.ts reads only an explicit set of public columns from the dedicated Neon project.
- PUBLIC_CATALOG_READ_ENABLED must equal true and PUBLIC_CATALOG_DATABASE_URL must be configured server-side.
- Use a least-privilege read-only Neon role for this reader.
- drizzle/public-catalog/0001_init.sql is for the separate Neon database only. It is not included in the private Drizzle migration chain.

## Cloudflare R2

- lib/server/public-media/r2.ts performs an S3-compatible signed upload using server-side credentials.
- Upload requires approvedForPublic: true, checks MIME type, file signature and a 25 MiB size ceiling, and generates immutable object keys.
- Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_PUBLIC and R2_PUBLIC_BASE_URL only in the server environment.
- This adapter is not yet wired into staff upload routes. Existing private uploads continue using the VPS media volume.

## Not yet implemented

The current catalog contains two sources: managed catalog and legacy published inventory. Do not synchronize either automatically until they are reconciled and the owner approves public price and availability semantics. The next phase must add an additive private transactional outbox, a sync worker, retries/idempotency, and tests proving sensitive fields are excluded.

## Safe state

All external feature flags remain false. No schema was applied, no data was copied, no credentials were configured and no production deployment was performed.
