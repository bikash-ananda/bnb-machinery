# B&B Machinery production setup on Contabo

This project runs as a single Next.js standalone container behind Caddy. The web container is not published directly; only Caddy exposes ports 80 and 443. Postgres and Redis stay on the private Compose network. Next.js recommends placing a reverse proxy in front of a self-hosted server ([self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting)).

## Before connecting the VPS

- Use a domain you control. Point A records for the root domain, www, and admin to 169.58.25.131. Caddy needs public DNS plus reachable TCP ports 80 and 443 to issue HTTPS certificates.
- Have a stable public IP/CIDR for the admin allowlist. The shipped example uses 203.0.113.1/32, a documentation-only address that intentionally blocks admin access until replaced.
- Make sure the project changes intended for production are pushed to the repository's main branch before cloning it on the server.
- Prepare the PostgreSQL database, persistent media volume, Resend sender credentials and OTP_HASH_SECRET. The application uses VPS PostgreSQL; no Supabase account or service-role key is required.
- Verify a sender domain with Resend and set OTP_FROM_EMAIL. Admin sign-in requires email OTP, OTP_HASH_SECRET and the local PostgreSQL migrations.

## Harden the VPS

The supplied instance is 169.58.25.131. Add an SSH public key in the Contabo console, then connect as root:

```sh
ssh root@169.58.25.131
```

Copy infra/scripts/harden-server.sh to the server and run it as root. The script creates a deploy account, installs Docker, enables a firewall for SSH/HTTP/HTTPS, and disables root/password SSH. Keep the first SSH session open, then verify a second session works before closing it:

```sh
ssh deploy@169.58.25.131
```

Do not run the hardening script until a valid SSH public key is installed for root; it deliberately stops if it cannot copy one to the deploy account.

## Install the release and production settings

From a deploy SSH session, clone the repository's production main branch into /home/deploy/app:

```sh
cd /home/deploy
git clone https://github.com/bikash-ananda/bnb-machinery.git app
cd app
cp infra/.env.production.example infra/.env.production
chmod 600 infra/.env.production
```

Generate separate random passwords on the VPS with openssl rand -hex 32. Put them in POSTGRES_PASSWORD, REDIS_PASSWORD, and OTP_HASH_SECRET. The hex format is safe in the Postgres connection URL. Fill in:

- DOMAIN: the domain you control, without https://.
- APP_ORIGIN: https:// plus the root domain, with no trailing slash.
- ADMIN_ALLOWED_IPS: your stable public IPv4/CIDR, for example 198.51.100.25/32. You can include your office VPN/network CIDR too. The root and www domains block /admin and /api/admin from all other IPs.
- RESEND_API_KEY and OTP_FROM_EMAIL: the API key and an authenticated sender address.
- AUTOMATION_FROM_EMAIL and AUTOMATION_ALERT_EMAIL: verified Resend sender and the business inbox for order, stock and daily finance alerts. Generate AUTOMATION_CRON_SECRET with `openssl rand -hex 32`; keep it private.
- ORDER_NOTIFY_EMAIL: the inbox that receives new order notices. It defaults to bikashengineering100@gmail.com in the example.
- OPENAI_API_KEY, GOOGLE_CSE_API_KEY, and GOOGLE_CSE_CX only if those integrations are enabled.

Never commit or send infra/.env.production to Git. This repository ignores .env* files, and .dockerignore excludes them from Docker build contexts.

## Initialize and start

From the app directory, run the application migrations against the VPS PostgreSQL database:

```sh
docker compose -f infra/docker-compose.yml --env-file infra/.env.production config -q
docker compose -f infra/docker-compose.yml --env-file infra/.env.production up -d --build
docker compose -f infra/docker-compose.yml --env-file infra/.env.production ps
```

Compose starts Postgres and Redis, runs Drizzle migrations as a one-shot service, waits for the migration and web health check, and then starts Caddy. Check failures with:

```sh
docker compose -f infra/docker-compose.yml --env-file infra/.env.production logs --tail=100 migrate web caddy
```

Compose also starts the internal automation runner. It calls the authenticated automation endpoint every minute to drain business events, send retryable emails and schedule payment reminders, customer follow-ups and the Nepal-time daily digest. The runner is private to the Compose network and is not exposed through Caddy.

Open https://DOMAIN after DNS has propagated. The basic health route is https://DOMAIN/api/health. Admin is available at https://admin.DOMAIN/admin/login or https://DOMAIN/admin/login from an allowlisted IP.

## Create the requested Super Admin

Run this after the PostgreSQL migrations are applied and the production environment is configured. To create the account if it is new, enter a unique temporary password without putting it into shell history:

```sh
cd /home/deploy/app
read -rsp 'Temporary admin password: ' SUPER_ADMIN_TEMP_PASSWORD; echo
export SUPER_ADMIN_TEMP_PASSWORD
docker compose -f infra/docker-compose.yml --env-file infra/.env.production run --rm -e SUPER_ADMIN_TEMP_PASSWORD migrate node scripts/create-super-admin.mjs --email bikashengineering100@gmail.com --name 'B&B Super Admin'
unset SUPER_ADMIN_TEMP_PASSWORD
```

The bootstrap writes a scrypt hash and requires a password change at first login. The admin signs in at /admin/login, receives the one-time code at the specified email, and chooses a permanent password. If the address already has an admin account, promote it without resetting its password:

```sh
docker compose -f infra/docker-compose.yml --env-file infra/.env.production run --rm migrate node scripts/create-super-admin.mjs --promote bikashengineering100@gmail.com
```

The account cannot complete sign-in until Resend, the verified sender, OTP_HASH_SECRET, and PostgreSQL are configured.

## Verify, back up, and update

Confirm the home page and /api/health load over HTTPS, test the checkout and payment QR flow, and verify the email OTP arrives before sharing the site publicly. Test the admin allowlist from both an allowed and a blocked network.

For backups, configure an off-site copy and schedule infra/scripts/backup.sh; periodically restore a database dump to the scratch database using infra/scripts/restore.sh. A snapshot on the same VPS is not an off-site backup.

To update after publishing changes to main:

```sh
cd /home/deploy/app
git pull --ff-only origin main
docker compose -f infra/docker-compose.yml --env-file infra/.env.production up -d --build
```

The Compose volumes retain Postgres, Redis, media, bot data, and Caddy certificates across application updates.
