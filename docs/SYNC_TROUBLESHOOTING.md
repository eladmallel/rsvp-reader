# Readwise Sync Troubleshooting Guide

## Common Issues

### Manual Sync Not Fetching New Articles

**Symptoms:**

- Manual sync appears to complete successfully
- No errors shown in UI
- But new articles don't appear in library

**Root Cause:**
The sync can get stuck in "initial backfill" mode if:

1. One location (e.g., "inbox") already has a timestamp cursor from previous incremental syncs
2. Other locations ("later", "feed") still need initial backfill
3. Budget (20 requests/minute) gets exhausted on one location before completing all locations
4. `initial_backfill_done` stays `false`, preventing incremental syncs

During initial backfill mode, the sync:

- Skips locations that already have timestamp cursors (considers them "done")
- Only syncs locations that need backfill
- Doesn't do incremental updates to "done" locations

**How to Diagnose:**

```bash
# Check sync state
node scripts/check-db-state.mjs

# Look for:
# - initial_backfill_done: false
# - Some cursors are timestamps, others are null
# - window_request_count: 20 (budget exhausted)
```

**How to Fix:**

```bash
# Mark initial backfill as complete and reset rate limits
node scripts/fix-sync-state.mjs
```

This sets:

- `initial_backfill_done: true` - Enable incremental syncs
- `next_allowed_at: null` - Clear rate limit
- `window_request_count: 0` - Reset budget
- `library_cursor` and `feed_cursor` to current timestamp

After running this, manual sync will work normally and fetch new articles incrementally.

### Rate Limiting

**Symptoms:**

- Sync button shows "Syncing..." briefly, then nothing happens
- No visible error in UI
- Rate limit error in server logs

**Root Cause:**

- Sync budget exhausted (20 requests in current 1-minute window)
- `next_allowed_at` set to future time

**How to Diagnose:**

```bash
node scripts/check-db-state.mjs

# Check next_allowed_at - if it's in the future, you're rate limited
```

**How to Fix:**

- Wait for rate limit window to expire (check `next_allowed_at`)
- OR manually clear it: `node scripts/fix-sync-state.mjs`

## Diagnostic Scripts

### check-db-state.mjs

Shows:

- Whether user has Reader token
- Current sync state
- Number of cached documents

```bash
node scripts/check-db-state.mjs
```

### check-latest-docs.mjs

Shows latest cached documents per location (new/later/archive)

```bash
node scripts/check-latest-docs.mjs
```

### fix-sync-state.mjs

Fixes stuck sync state by:

- Marking initial backfill complete
- Clearing rate limits
- Resetting budget

```bash
node scripts/fix-sync-state.mjs
```

## Prevention

To prevent getting stuck in initial backfill:

1. **Increase page size** for initial backfill to fetch more docs per request
2. **Prioritize incremental syncs** - always sync locations with new updates first
3. **Better budget management** - reserve budget for all three locations
4. **Smarter completion detection** - don't mark location as "done" just because it has a timestamp cursor

## Implementation Notes

The sync logic has two modes:

**Initial Backfill Mode** (`initial_backfill_done: false`):

- Syncs inbox, library, feed sequentially until all complete
- Considers location "done" if cursor is a timestamp
- Only marks `initial_backfill_done: true` when ALL three complete

**Incremental Mode** (`initial_backfill_done: true`):

- Syncs all three locations in parallel (budget permitting)
- Uses `updatedAfter` parameter to fetch only new/updated docs
- Much faster and more efficient

The bug occurs when a location gets a timestamp cursor before initial backfill completes (from a manual partial sync), causing it to be skipped in future backfill attempts.
