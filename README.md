# B & B Machinery

B & B Machinery is a Next.js business website and machinery platform. The Contabo VPS hosts the application, private business database and confidential media. See the [external public data architecture](docs/EXTERNAL_PUBLIC_DATA_ARCHITECTURE.md) for the approved future separation of public files and public catalog data.

## Current production architecture

- Application: Next.js App Router, TypeScript and React
- Private business database: PostgreSQL 16 on the Contabo VPS, accessed through Drizzle ORM
- Cache and background jobs: Redis
- Current media storage: private persistent VPS volume mounted at `/data/media`
- Deployment: Docker Compose on the Contabo VPS, behind the existing host Caddy reverse proxy

## Approved target architecture (not active yet)

- Public approved media: Cloudflare R2
- Public product catalog read model: Neon PostgreSQL
- Private customer, supplier, sales, purchase, accounting, payment, admin and audit data: existing VPS PostgreSQL
- Draft/unapproved and confidential files: existing private VPS media storage

Neon must not replace the private `DATABASE_URL`. The public catalog will receive only an explicit allowlist of published fields through a server-side synchronization process. Public media migration is limited to approved/published files. No external service is enabled by adding the example environment variables alone.

The R2/Neon integration is not active until its adapters, tests, staging environment and owner-approved production rollout are complete. Never place R2 or Neon credentials in `NEXT_PUBLIC_*` variables or source control.

## Inventory workflow

1. Staff sign in using the configured one-time email code.
2. Authorized inventory staff create product drafts and upload product photos.
3. Optional server-side image analysis provides suggestions in separate AI fields; it does not overwrite staff-entered information.
4. Staff review and submit a draft for owner review.
5. An authorized owner reviews, edits, approves, rejects, or requests corrections.
6. Only products meeting the required approval and publication states appear in the public catalog.

Draft and private inventory media remain on the private VPS storage. Public R2 publishing is a separate owner-approved operation.

## Admin AI assistant

The protected `/admin/ai` workspace provides role-scoped Business, Sales, Inventory, Purchasing and Accounting agents. The agents use read-only server tools over existing business records. They cannot place orders, change stock or prices, post accounting entries, issue refunds or send messages.

Configure AI providers only through server-side environment variables. Never expose provider credentials through `NEXT_PUBLIC_*` variables. See [AI agent architecture](docs/AI_AGENT_ARCHITECTURE.md) and [implementation status](docs/IMPLEMENTATION_STATUS.md).

## Environment configuration

Production configuration is stored privately at `infra/.env.production` on the VPS. Do not commit it, overwrite it with the example file, or paste its values into chat.

Use `.env.example` and `infra/.env.production.example` as variable-name references only. External R2/Neon placeholders are intentionally empty and all related feature switches default to `false`.

Generate strong secrets on the server with `openssl rand -hex 32`. Configure email delivery with a verified sender before enabling staff OTP login.

## Local development

Install dependencies with `pnpm install`. Start the local PostgreSQL and Redis services using:

```sh
docker compose -f infra/docker-compose.dev.yml up -d
```

Then configure a local `.env.local` using the current `.env.example` variable names and run:

```sh
pnpm dev
```

Do not point local development at the production database.

## Checks

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

For deployment and production safety procedures, see [infra/DEPLOY.md](infra/DEPLOY.md).
