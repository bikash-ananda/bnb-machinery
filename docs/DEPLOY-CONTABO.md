# Deploy on Contabo Cloud VPS (4 vCPU, 8 GB RAM, 100 GB SSD, 1 server)

Deploy last, after Phases 0–4 work locally. These steps are ready now.

## 1. Order and first login
1. Choose **Ubuntu 24.04**, region **Asia (India)** (chosen by owner; good latency to Nepal), add your **SSH public key** at checkout (not a root password).
2. Buy a domain; create DNS `A` records: `@`, `www`, `admin` -> server IP (lower TTL to 300 first).
3. `ssh root@SERVER_IP`

## 2. Harden (once)
Copy `infra/scripts/harden-server.sh` to the server and run it as root: `bash harden-server.sh deploy`.
It creates the `deploy` user, enables the firewall (22/80/443), disables password SSH and root login, installs fail2ban, auto-updates and Docker.
**Test `ssh deploy@SERVER_IP` in a second window before closing the first.**

## 3. Get the code and secrets
```bash
git clone https://github.com/<you>/<repo>.git app && cd app
cp infra/.env.production.example infra/.env.production && chmod 600 infra/.env.production
nano infra/.env.production      # DOMAIN, APP_ORIGIN, passwords (openssl rand -hex 32), SESSION_SECRET, TOTP_ENC_KEY
```

## 4. Start
```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.production up -d --build
docker compose -f infra/docker-compose.yml --env-file infra/.env.production exec web pnpm db:migrate   # once Drizzle exists (Roadmap 0.3)
docker compose -f infra/docker-compose.yml --env-file infra/.env.production exec web pnpm admin:create # first owner + 2FA (Roadmap 1.4)
```
Caddy fetches HTTPS certificates automatically once DNS points to the server.

## 5. Move data from Supabase (Roadmap 1.2)
`pg_dump` the Supabase database (connection string from Supabase > Project Settings > Database) and restore into the VPS Postgres; export product images from
Supabase Storage / the images table into `/data/media`. The migration script prints row counts to compare. Keep Supabase read-only for 2 weeks as a fallback.

## 6. Backups and monitoring
Cron: `15 2 * * * /home/deploy/app/infra/scripts/backup.sh`. Configure `rclone` for an off-site bucket. Run `restore.sh` monthly. Add Uptime Kuma (second container or external) for site + admin.
Take a **Contabo snapshot** before every major upgrade (you have 1).

## 7. Updating
```bash
git pull && docker compose -f infra/docker-compose.yml --env-file infra/.env.production up -d --build
docker compose ... exec web pnpm db:migrate
```
Rollback: `git checkout <previous-tag>` and rebuild; if a migration broke data, restore the last dump (restore.sh) or the snapshot.

## 8. Go-live checklist
DNS + HTTPS ok · 2FA enforced · admin IP allowlist decided · backups + restore drill done · accountant approved invoice format and VAT settings · test order, quote, invoice print on A4 and 80mm · WhatsApp/email templates approved.
