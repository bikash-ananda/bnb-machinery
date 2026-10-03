# B & B Machinery

This repository is the existing B & B Machinery website plus a staff inventory workflow. The public catalog only reads products with both APPROVED verification and PUBLISHED publication status.

## Inventory workflow

1. Tap the company logo to open staff sign in.
2. Request a one-time code by email and verify it.
3. Add product photos; the originals are stored in a private bucket.
4. Google Lens opens as a separate reference tool. Staff upload the image there themselves; results are not imported or treated as verified.
5. Optional server-side image analysis writes suggestions into separate AI fields. It never overwrites staff-entered product information.
6. Staff review and submit a draft.
7. An explicitly configured owner reviews, edits, and either approves and publishes, rejects, or requests a correction.

There is no registration, password login, or social login. The inventory editor address is fixed in server code. A second email can only receive the OWNER role when the single OWNER_EMAIL environment variable is configured; leave it empty until the owner address is confirmed. No arbitrary account list is accepted.

## Services to configure

The repository does not contain a database, email sender, storage account, owner address, or API credentials. The workflow fails closed until its server environment is configured.

1. Create a Supabase project and run the SQL in supabase/migrations/202610030001_inventory_workflow.sql in its SQL editor. This creates the inventory tables, restricted RPC functions, RLS settings, and a private inventory-private storage bucket.
2. Copy .env.example to .env.local and fill the server settings. Never use a NEXT_PUBLIC_ prefix for the service role key, Resend key, OTP hash secret, or AI key.
3. Set APP_ORIGIN to the exact site origin. Use the HTTPS production origin for deployment.
4. Configure Resend with a verified sender and set RESEND_API_KEY and OTP_FROM_EMAIL.
5. Generate a unique OTP_HASH_SECRET with at least 32 characters. For example, run: node -p "require('node:crypto').randomBytes(32).toString('hex')" in a trusted terminal.
6. Set OWNER_EMAIL only after the owner account is confirmed. It must be a single address; no default owner account is created.
7. To enable AI suggestions, configure a server-side OPENAI_API_KEY and OPENAI_MODEL that supports image inputs. Without both values, uploads remain available for manual review. AI results stay unverified. See the official image input guide: https://developers.openai.com/api/docs/guides/images-vision

The upload endpoint accepts up to five JPG, PNG, or WebP images, with a 10 MB limit per image and a 25 MB combined limit. The hosting platform must allow requests large enough for that combined upload size.

## Local development

Run pnpm install, then pnpm dev.

Set APP_ORIGIN=http://localhost:3000 for local same-origin checks. To exercise OTP, inventory persistence, media, and owner review locally, configure Supabase and Resend first.

## Checks

- pnpm lint
- pnpm exec tsc --noEmit
- pnpm build

There is no test script or existing test suite in the package manifest.
