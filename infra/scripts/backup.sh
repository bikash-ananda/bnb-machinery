#!/usr/bin/env bash
# Nightly backup. Cron (as deploy user):  15 2 * * * /home/deploy/app/infra/scripts/backup.sh >> /home/deploy/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/../.."
STAMP=$(date +%Y%m%d-%H%M%S)
OUT=/home/deploy/backups
mkdir -p "$OUT"

docker compose -f infra/docker-compose.yml --env-file infra/.env.production exec -T postgres \
  pg_dump -U bnb -d bnb -Fc > "$OUT/db-$STAMP.dump"
docker run --rm -v bnb_media:/data/media -v "$OUT":/out alpine tar czf "/out/media-$STAMP.tgz" -C /data media
docker run --rm -v bnb_botdata:/data/bot -v "$OUT":/out alpine tar czf "/out/botdata-$STAMP.tgz" -C /data bot

# Off-site copy: configure rclone once (`rclone config`, remote named "offsite"), then uncomment:
# rclone copy "$OUT" offsite:bnb-backups --max-age 2d

find "$OUT" -type f -mtime +14 -delete
echo "backup ok $STAMP"
