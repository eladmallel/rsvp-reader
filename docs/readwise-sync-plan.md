# Readwise Background Sync Plan

## Goals

- Stop per-request Readwise fetches in the app; always read from our DB cache.
- Respect Readwise rate limits while keeping data reasonably fresh.
- Keep implementation minimal: cron + per-user cursors + upserts.

## Constraints + Assumptions

- Readwise list endpoint rate limit: 20 req/min (per token).
- Prefer bulk list calls over per-document calls.
- We can store full HTML and derived plain text in `cached_articles`.

## Data Model (Minimal Additions)

New table: `readwise_sync_state`

- `user_id` (PK, FK users)
- `library_cursor` (timestamp or cursor token)
- `inbox_cursor` (timestamp or cursor token)
- `feed_cursor` (timestamp or cursor token)
- `next_allowed_at` (timestamptz)
- `last_sync_at` (timestamptz)
- `in_progress` (bool)
- `initial_backfill_done` (bool)

Existing table: `cached_articles` (already in plan)

- Add `reader_updated_at` (timestamptz) for upsert comparisons.

## Worker Overview

Cron runs once per day:

1. Select users where `next_allowed_at <= now()` and not `in_progress`.
2. For each user, run a single "sync job" with a max request budget (20).
3. Update `next_allowed_at` to `now() + 60s` after budget is used or a 429 occurs.

## Sync Job Logic

### 1) Initial Backfill (on connect)

- Run for `location=new` (inbox) first, then `location=later`, then `location=feed`.
- Use list endpoint pagination with max page size.
- For each item returned:
  - Upsert into `cached_articles` (store HTML + derived plain text).
  - Track the latest `reader_updated_at` seen for cursor updates.
- Stop once request budget is hit; resume next cron.

### 2) Incremental Sync

- Use `updated_after` (or cursor token if provided by Readwise) from `*_cursor`.
- Same upsert logic as initial; update cursor to newest `reader_updated_at`.

### 3) Content Strategy

- Prefer list responses that include HTML content if supported (one request per page).
- If list response omits HTML:
  - Fetch document HTML individually, but only within remaining budget.
  - Defer leftover IDs to next cron tick.

## Rate Limiting Strategy (Simple + Safe)

- Hard cap: 20 requests per user per minute in the sync job.
- Honor `Retry-After` header on 429; set `next_allowed_at` accordingly.
- On 5xx, stop and retry on next cron tick (no aggressive retry loops).

## Rate Limit Enforcement (Robust + Explicit)

We track limits per user token (Readwise rate limits are per access token), not globally.
There is no shared global counter across users; each token gets its own 20 req/min window.

Add fields to `readwise_sync_state`:

- `window_started_at` (timestamptz)
- `window_request_count` (integer)
- `last_429_at` (timestamptz)

Algorithm:

1. Before each Readwise request, check `window_started_at`:
   - If `now() - window_started_at >= 60s`, reset window and count to 0.
2. If `window_request_count >= 20`, stop the job and set `next_allowed_at = window_started_at + 60s`.
3. After every successful request, increment `window_request_count`.
4. If a 429 is returned:
   - Read `Retry-After` seconds (if present).
   - Set `next_allowed_at = now() + retry_after` (or `window_started_at + 60s` if missing).
   - Record `last_429_at` and stop immediately (no retries in the same run).

Concurrency safety:

- Use a per-user lock or `in_progress` flag with a DB transaction.
- If a job starts while `in_progress = true`, it should exit without doing work.

## App Behavior Changes

- Library/Feed endpoints read from DB only.
- Article view reads cached HTML from DB only.
- If content missing, return "sync pending" + trigger a low-priority sync (no direct Readwise call).

## Minimal API/Infra Changes

- Add cron-triggered endpoint: `/api/sync/readwise` (server-side only).
- Optional: admin-only endpoint to re-run initial backfill per user.
- Use Vercel Cron Jobs (native platform feature) or Supabase scheduled functions to call the sync endpoint.

## Cron Implementation (Vercel)

- Vercel Cron Jobs is a platform feature that hits a URL on a schedule.
- We register a cron in `vercel.json` that calls `/api/sync/readwise` once per day.
- The endpoint verifies a shared secret (header or query param) to avoid public abuse.
- Execution is stateless: each run pulls eligible users and does a small batch.

Example `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync/readwise?token=$SYNC_API_KEY",
      "schedule": "0 0 * * *"
    }
  ]
}
```

If we avoid Vercel Cron:

- Use Supabase scheduled functions (pg cron or Edge Function cron).
- Same endpoint is invoked; auth via a service role or secret header.

## Local Dev (Cron Emulation)

- Use `scripts/run-readwise-sync-cron.sh` to ping the sync endpoint once per day.
- Set `READWISE_SYNC_URL` to your local endpoint (include the secret token).

## Success Criteria

- Zero Readwise calls from user-facing requests.
- Sync jobs never exceed 20 req/min per user.
- Cached articles load instantly in the app.
