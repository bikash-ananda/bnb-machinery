#!/usr/bin/env bash
# Restore a database dump into a SCRATCH database to prove backups work (monthly drill).
# Usage: infra/scripts/restore.sh /home/deploy/backups/db-YYYYmmdd-HHMMSS.dump
set -euo pipefail
cd "$(dirname "$0")/../.."
DUMP="${1:?path to .dump file}"
docker compose -f infra/docker-compose.yml --env-file infra/.env.production exec -T postgres psql -U bnb -c "DROP DATABASE IF EXISTS bnb_restore_test;" -c "CREATE DATABASE bnb_restore_test;"
cat "$DUMP" | docker compose -f infra/docker-compose.yml --env-file infra/.env.production exec -T postgres pg_restore -U bnb -d bnb_restore_test --no-owner
echo "Restored into bnb_restore_test. Check row counts, then: DROP DATABASE bnb_restore_test;"
