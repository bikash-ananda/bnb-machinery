# Shared Contabo VPS deployment

This deployment serves `machinery-tools.com` on the existing Contabo VPS at `169.58.25.131`. The VPS already runs several sites and its host Caddy service owns ports 80 and 443. Keep those listeners and the other Compose projects intact.

The app is built on the VPS with Docker. A local pnpm build is not required.

## DNS

At the domain's DNS provider, set:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `169.58.25.131` |
| CNAME | `www` | `machinery-tools.com` |

If the provider does not support a CNAME for `www`, set an A record for `www` to `169.58.25.131`. Do not add an AAAA record until IPv6 reachability and firewall rules for ports 80/443 are confirmed; a stale AAAA record can send visitors to a broken route.

DNS changes happen at the registrar/DNS provider, not in Docker. Verify them before reloading Caddy:

```sh
getent ahostsv4 machinery-tools.com
getent ahostsv4 www.machinery-tools.com
```

## Shared-host rules

- Do not start this project's `caddy` container on this VPS. It would compete with the host Caddy on ports 80 and 443. Compose puts that service behind the opt-in `standalone` profile.
- The app listens on `127.0.0.1:3083` by default. The existing host Caddy should proxy the two domain names to `127.0.0.1:3083`.
- The Compose project is named `bnb-machinery` so its containers and volumes remain separate from the existing sites.
- Do not run `infra/scripts/harden-server.sh` unchanged on this multi-site host. It enables UFW with only SSH, HTTP and HTTPS allowed, which can block ports used by current services, including 1935 and 8189. Preserve the existing firewall and SSH access while adding this site.

## Clone and configure on the VPS

Use a deployment account that already has Docker access and SSH access. From that account, clone `main`. If the repository is private, configure a read-only deploy key for the account first.

```sh
git clone --branch main --single-branch https://github.com/bikash-ananda/bnb-machinery.git ~/bnb-machinery
cd ~/bnb-machinery
cp infra/.env.production.example infra/.env.production
chmod 600 infra/.env.production
```

Edit `infra/.env.production` on the VPS before starting the app. Keep these values:

```dotenv
DOMAIN=machinery-tools.com
APP_ORIGIN=https://machinery-tools.com
APP_HOST_PORT=3083
```

Then set unique random values for `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `OTP_HASH_SECRET` and `AUTOMATION_CRON_SECRET`; update `DATABASE_URL` and `REDIS_URL` to match. Set `RESEND_API_KEY`, verified sender addresses and the owner/order email addresses. PostgreSQL is the single application database; no Supabase credentials are used. Replace the documentation-only `ADMIN_ALLOWED_IPS` value with the trusted admin IP/CIDR. Keep all credentials private and out of Git.

Generate random secrets on the VPS with `openssl rand -hex 32`. Use the resulting values in the private environment file. Do not paste secrets into chat.

## Add the site to the existing Caddy config

Inspect the current `/etc/caddy/Caddyfile` and any imported site files first. Add these site blocks without replacing or editing other sites. Replace `TRUSTED_ADMIN_CIDR` with the real trusted admin IP/CIDR before loading the config:

```caddyfile
www.machinery-tools.com {
	redir https://machinery-tools.com{uri} permanent
}

machinery-tools.com {
	encode zstd gzip
	@adminDenied {
		path /admin /admin/* /api/admin /api/admin/*
		not remote_ip TRUSTED_ADMIN_CIDR
	}
	respond @adminDenied 403
	reverse_proxy 127.0.0.1:3083
}
```

Validate before reloading the existing host service:

```sh
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Caddy will obtain HTTPS certificates after both DNS names resolve to the VPS and inbound 80/443 remain reachable.

## Build and start only this app's services

From the repository root, run:

```sh
docker compose -p bnb-machinery -f infra/docker-compose.yml --env-file infra/.env.production up -d --build postgres redis migrate web automation
```

This intentionally omits the bundled Caddy service. Check the release:

```sh
docker compose -p bnb-machinery -f infra/docker-compose.yml --env-file infra/.env.production ps
docker compose -p bnb-machinery -f infra/docker-compose.yml --env-file infra/.env.production logs --tail=100 web migrate automation
curl --fail http://127.0.0.1:3083/api/health
curl --fail https://machinery-tools.com/api/health
curl --fail https://machinery-tools.com/robots.txt
curl --fail https://machinery-tools.com/sitemap.xml
```

For updates, run `git pull --ff-only origin main`, then repeat the Compose command. Postgres, Redis, media and bot data use this Compose project's named volumes and remain isolated from the other sites.

## Dedicated-host alternative

Only if deploying to a separate server where ports 80 and 443 are free, start the bundled proxy explicitly with `--profile standalone`. Do not use this mode on the shared Contabo VPS.
