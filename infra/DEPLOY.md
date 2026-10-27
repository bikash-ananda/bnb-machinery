# Contabo VPS deployment

This repository is prepared for a manual Docker Compose deployment to `machinery-tools.com`. No server login or deployment is performed by this guide. The VPS hostname supplied for the next step is `vmi3648298`.

## Before connecting

1. Point the domain's `A` records for `@` and `www` to the VPS public IPv4 address. Add `AAAA` records only if IPv6 is configured and reachable on the VPS.
2. Allow inbound SSH, HTTP (80) and HTTPS (443) in the VPS firewall. Caddy obtains and renews TLS certificates automatically.
3. Make sure an SSH key is installed before running `infra/scripts/harden-server.sh`. That script disables root SSH login after creating the `deploy` account; keep the first session open and verify a new `deploy` login before closing it.

## First deployment

From the local repository, copy the hardening script to the VPS. It installs Docker and Compose, creates the `deploy` account, enables the firewall and disables root SSH login. First install your public SSH key for root; keep the root session open while you verify the new account:

```sh
scp infra/scripts/harden-server.sh root@vmi3648298:/root/harden-server.sh
ssh root@vmi3648298
chmod 700 /root/harden-server.sh
/root/harden-server.sh deploy
```

Open a second terminal and confirm key-based login as `deploy`. Keep that shell open:

```sh
ssh deploy@vmi3648298
```

Clone the `main` branch into the deploy user's home. Use HTTPS for a public repository. If the repository is private, configure a read-only GitHub deploy key for this user and use the SSH clone URL instead:

```sh
git clone --branch main --single-branch https://github.com/bikash-ananda/bnb-machinery.git ~/bnb-machinery
cd ~/bnb-machinery
```

Create the private production environment file and restrict its permissions:

```sh
cp infra/.env.production.example infra/.env.production
chmod 600 infra/.env.production
```

Edit `infra/.env.production` on the VPS before starting Compose:

- Keep `DOMAIN=machinery-tools.com` and `APP_ORIGIN=https://machinery-tools.com`.
- Replace `ADMIN_ALLOWED_IPS` with the trusted admin IP/CIDR. The example uses a documentation-only address and will deny real admin access until changed.
- Set unique random values for `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `OTP_HASH_SECRET` and `AUTOMATION_CRON_SECRET` (`openssl rand -hex 32` is suitable for these secrets). Update both database URLs to match their passwords.
- Fill the Supabase project URL and service-role key, Resend key and verified sender. These are needed for admin authentication, inventory and OTP email.
- Confirm `OWNER_EMAIL`, `AUTOMATION_ALERT_EMAIL` and `ORDER_NOTIFY_EMAIL` before enabling owner or notification flows. Keep provider credentials private and never add this file to Git.

Start the stack from the repository root. Compose builds the app, waits for Postgres and Redis, runs the checked-in database migrations, and then starts the web and automation services:

```sh
docker compose -f infra/docker-compose.yml --env-file infra/.env.production up -d --build
```

## Check the release

```sh
docker compose -f infra/docker-compose.yml --env-file infra/.env.production ps
docker compose -f infra/docker-compose.yml --env-file infra/.env.production logs --tail=100 web caddy migrate
curl --fail https://machinery-tools.com/api/health
curl --fail https://machinery-tools.com/robots.txt
curl --fail https://machinery-tools.com/sitemap.xml
```

The `www` host redirects to the apex domain. After DNS and HTTPS work, verify both `https://machinery-tools.com` and `https://www.machinery-tools.com`, then submit `https://machinery-tools.com/sitemap.xml` in Google Search Console. Schedule `infra/scripts/backup.sh` after confirming the first successful database migration and backup destination.

For updates, fetch the intended `main` revision and run the same Compose command. The production environment file, database volume and media volumes remain on the VPS and are excluded from Git.
