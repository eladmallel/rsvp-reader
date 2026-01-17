#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${READWISE_SYNC_URL:-}" ]]; then
  echo "READWISE_SYNC_URL is required (e.g., http://localhost:3000/api/sync/readwise?token=...)"
  exit 1
fi

INTERVAL_SECONDS="${READWISE_SYNC_INTERVAL_SECONDS:-60}"

while true; do
  curl -fsS "$READWISE_SYNC_URL" >/dev/null
  sleep "$INTERVAL_SECONDS"
done
