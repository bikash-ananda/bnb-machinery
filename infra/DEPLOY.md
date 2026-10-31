# B&B Machinery — shared Contabo VPS deployment

This project runs on the existing multi-site Contabo VPS. The production domain is `bnbmachinery.com`. The app uses Next.js, PostgreSQL 16, Redis 7, Drizzle migrations, persistent local media storage and the existing host Caddy reverse proxy. PostgreSQL is the sole application database.

## Safety rules for this VPS

- Project directory: `/opt/bnb-machinery`.
- Compose project name: `bnb-machinery`. Keep it unchanged so existing named volumes remain associated with this project.
- The web service listens on `127.0.0.1:3083`; the existing host Caddy owns public ports 80 and 443.
- Never start this project's bundled Caddy profile on this shared host.
- Do not run `infra/scripts/harden-server.sh` on this multi-site server. It can change firewall and SSH rules used by other projects.
- Do not run `docker compose down -v`, delete volumes, reset PostgreSQL, or run manual DROP/TRUNCATE statements.
- Other sites and services share this VPS. Do not stop or recreate containers outside this Compose project.

## 1. Inspect before rollout

From the VPS:

```sh
cd /opt/bnb-machinery
git status --short
git branch --show-current
git log -1 --oneline
docker compose -p bnb-machinery -f infra/docker-compose.yml --env-file infra/.env.production config -q
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Confirm the working tree and current container/volume configuration before updating. Keep any untracked backups; do not clean them automatically.

## 2. Back up the existing database and media

Create a private backup directory and export PostgreSQL before applying migrations:

```sh
mkdir -p /opt/backups/bnb-machinery
chmod 700 /opt/backups/bnb-machinery
docker exec bnb-machinery-postgres-1 sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "/opt/backups/bnb-machinery/postgres-$(date +%Y%m%d-%H%M%S).dump"
test -s /opt/backups/bnb-machinery/*.dump
```

Back up the persistent media volume separately. First inspect its actual mount:

```sh
docker inspect bnb-machinery-web-1 --format '{{json .Mounts}}'
```

Use the confirmed host volume/source path to archive media. Do not guess the volume name.

## 3. Configure environment

Keep the existing private file `infra/.env.production`; do not overwrite it with the example. The file should contain only variables required by the current PostgreSQL, Redis, email, OTP, automation and explicitly enabled AI integrations. Remove obsolete database-provider settings after confirming the current release is healthy.

Required production settings include:

- `DOMAIN=bnbmachinery.com`
- `APP_ORIGIN=https://bnbmachinery.com`
- `APP_HOST_PORT=3083`
- `POSTGRES_PASSWORD` and matching `DATABASE_URL`
- `REDIS_PASSWORD` and matching `REDIS_URL`
- `OTP_HASH_SECRET` (at least 32 characters)
- `OWNER_EMAIL`, `ORDER_NOTIFY_EMAIL`
- `RESEND_API_KEY` and verified `OTP_FROM_EMAIL`
- `ADMIN_ALLOWED_IPS` set to the real trusted public IP/CIDR
- `AUTOMATION_CRON_SECRET` and any enabled AI provider keys

Generate new secrets on the VPS with `openssl rand -hex 32`. Never paste secrets into chat or commit them.

## 4. Caddy routing

Inspect the existing `/etc/caddy/Caddyfile` and imported site files. Preserve all other site blocks. The B&B Machinery site should proxy to the existing loopback listener:

```caddyfile
bnbmachinery.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3083
}

www.bnbmachinery.com {
    redir https://bnbmachinery.com{uri} permanent
}
```

Validate before reloading the host Caddy service:

```sh
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Do not overwrite the entire Caddyfile.

## 5. Apply the PostgreSQL release

Only after the backup, environment, and Compose configuration have been checked:

```sh
git fetch origin
git checkout main
git pull --ff-only origin main
docker compose -p bnb-machinery -f infra/docker-compose.yml --env-file infra/.env.production up -d --build postgres redis migrate web automation
```

This runs the checked-in additive Drizzle migrations before the web service starts. It does not start the bundled Caddy service. Do not use `down -v`.

## 6. Verify

```sh
docker compose -p bnb-machinery -f infra/docker-compose.yml --env-file infra/.env.production ps
docker compose -p bnb-machinery -f infra/docker-compose.yml --env-file infra/.env.production logs --tail=150 migrate web automation
curl --fail http://127.0.0.1:3083/api/health
curl --fail https://www.bnbmachinery.com/api/health
curl --fail https://www.bnbmachinery.com/robots.txt
curl --fail https://www.bnbmachinery.com/sitemap.xml
```

Check that application requests use only the configured PostgreSQL, Redis, email and explicitly enabled provider services. Test public product browsing, order submission, admin login/OTP, password change, staff inventory authentication, image upload/read, reviews, and admin audit events.

## 7. Backups and rollback

Schedule `infra/scripts/backup.sh` and copy backups off-site. Periodically test a restore into a separate scratch database. A backup on the same VPS is not an off-site backup.

If the new release fails, preserve logs and the database dump. Roll back the application image/source to the previous known-good release; do not restore or delete database volumes unless a tested recovery plan specifically requires it. The new migrations are additive, so a code rollback should not require dropping their tables/columns.
