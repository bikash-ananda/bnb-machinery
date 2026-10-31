# B & B Machinery

B & B Machinery is a self-hosted Next.js business website and machinery platform. Production data is stored in PostgreSQL and accessed through Drizzle ORM. Redis supports background work; product media is stored on persistent VPS storage.

## Production architecture

- Application: Next.js App Router, TypeScript and React
- Database: PostgreSQL 16
- Database access and migrations: Drizzle ORM / drizzle-kit
- Cache and background jobs: Redis
- Persistent uploads: local media volume mounted at `/data/media`
- Deployment: Docker Compose on the Contabo VPS, behind the existing host Caddy reverse proxy

The application has no external hosted database, storage SDK, or vendor-specific database runtime dependency.

## Inventory workflow

1. Staff sign in using the configured one-time email code.
2. Authorized inventory staff create product drafts and upload product photos.
3. Optional server-side image analysis provides suggestions in separate AI fields; it does not overwrite staff-entered information.
4. Staff review and submit a draft for owner review.
5. An authorized owner reviews, edits, approves, rejects, or requests corrections.
6. Only products meeting the required approval and publication states appear in the public catalog.

Inventory media is stored on the persistent VPS media volume. The inventory editor identity and role rules are enforced server-side. The owner identity is configured through the server environment.

## Admin AI assistant

The protected `/admin/ai` workspace provides role-scoped Business, Sales, Inventory, Purchasing and Accounting agents. The agents use read-only server tools over existing business records. They cannot place orders, change stock or prices, post accounting entries, issue refunds or send messages.

Configure AI providers only through server-side environment variables. Never expose provider credentials through `NEXT_PUBLIC_*` variables. See [AI agent architecture](docs/AI_AGENT_ARCHITECTURE.md) and [implementation status](docs/IMPLEMENTATION_STATUS.md).

## Environment configuration

Production configuration is stored privately at `infra/.env.production` on the VPS. Do not commit it, overwrite it with the example file, or paste its values into chat.

Required settings include PostgreSQL and Redis connection details, application origin, OTP hashing secret, owner email, email delivery credentials, and any explicitly enabled AI provider credentials. Use `.env.example` as a variable-name reference only.

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
