#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SYNC_URL:-}" ]]; then
  echo "SYNC_URL is required (e.g., http://localhost:3000/api/sync/readwise?token=...)"
  exit 1
fi

INTERVAL_SECONDS="${SYNC_INTERVAL_SECONDS:-60}"

while true; do
  curl -fsS "$SYNC_URL" >/dev/null
  sleep "$INTERVAL_SECONDS"
done
