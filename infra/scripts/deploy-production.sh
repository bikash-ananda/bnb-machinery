#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/bnb-machinery"
ENV_FILE="$APP_DIR/infra/.env.production"
COMPOSE_FILE="$APP_DIR/infra/docker-compose.yml"
COMPOSE=(docker compose -p bnb-machinery --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Production environment file is missing: $ENV_FILE" >&2
  exit 1
fi

# Update only this checkout. Production secrets and named volumes remain outside Git.
git fetch --prune origin main
git checkout -B main origin/main
git reset --hard origin/main

# Never start this project's bundled Caddy on the shared multi-site VPS.
"${COMPOSE[@]}" config -q
"${COMPOSE[@]}" up -d --build postgres redis migrate web automation

# Wait for the app health endpoint. Fail the GitHub Actions run if it never becomes healthy.
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3083/api/health >/tmp/bnb-machinery-health.json 2>/dev/null; then
    echo "Application health check passed:"
    cat /tmp/bnb-machinery-health.json
    echo
    "${COMPOSE[@]}" ps
    exit 0
  fi
  echo "Waiting for Machinery Tools health check ($attempt/30)..."
  sleep 5
done

echo "ERROR: health check failed after deployment." >&2
"${COMPOSE[@]}" ps
"${COMPOSE[@]}" logs --tail=100 web migrate automation >&2
exit 1
