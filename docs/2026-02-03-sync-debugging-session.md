# Readwise Sync Debugging Session - 2026-02-03

## Session Summary

Continued debugging why `library_cursor` remained null after implementing the Readwise sync fixes. The primary issue was that library sync never started, even after multiple sync rounds and setting the `READWISE_SYNC_LOCATION_OVERRIDE` environment variable.

## Key Discovery

**The sync IS working!** Vercel logs revealed:

```
[syncLocation] later: Got 100 documents
```

This confirms:

1. The `READWISE_SYNC_LOCATION_OVERRIDE='later,archive,feed'` environment variable is properly set and working
2. Library sync (location: "later") is successfully fetching documents from Readwise API
3. The override successfully skipped inbox, allowing library to sync

## Current State

### What's Working

- Fix implementation completed and deployed
- Database migration applied (added `first_opened_at`, `last_opened_at` columns)
- PR merged to main branch
- Environment variable properly configured in Vercel production
- Sync is fetching documents from library (later) location

### New Issue Discovered

**Serverless Function Timeout**:

```
WARN! Exceeded query duration limit of 5 minutes
```

The sync function is hitting Vercel's serverless function timeout limit. This explains:

- Why subsequent sync attempts returned empty `results: []`
- Why progress may not be persisting to database
- Why the sync appeared "stuck"

### Sync State (Last Known)

From previous queries:

- `inbox_cursor`: timestamp (completed)
- `library_cursor`: null (but NOW syncing, cursor may have updated)
- `archive_cursor`: null
- `feed_cursor`: null
- `shortlist_cursor`: null
- `window_request_count`: 20 (full budget used)

**Note**: We need to query the database again to see if `library_cursor` has been updated after the successful sync that fetched 100 documents.

## Investigation Directions

### 1. Verify Current Sync Progress

**Action**: Query `readwise_sync_state` to check if `library_cursor` has been updated

```sql
SELECT
  library_cursor,
  inbox_cursor,
  archive_cursor,
  feed_cursor,
  shortlist_cursor,
  window_request_count,
  in_progress,
  next_allowed_at,
  last_sync_at
FROM readwise_sync_state
WHERE user_id = '486cfa76-4fcd-4ac0-870e-f06e4486d7c8';
```

**Expected**: `library_cursor` should now have a value (either `page:...` for pagination or a timestamp if complete)

### 2. Check Document Count

**Action**: Query how many documents were successfully stored

```sql
SELECT location, COUNT(*) as count
FROM cached_documents
WHERE user_id = '486cfa76-4fcd-4ac0-870e-f06e4486d7c8'
GROUP BY location;
```

**Expected**: Should see documents in "later" location (previously was 104, should be higher now)

### 3. Investigate Timeout Issue

**Root Cause**: The sync function is taking >5 minutes, exceeding Vercel's serverless function limit.

**Potential Causes**:

- Large number of documents being processed in single sync
- Database operations taking too long
- Network latency to Readwise API
- Budget system allowing too many API calls per sync

**Investigation Steps**:

1. Check Vercel function configuration (max duration)
2. Review how many API calls are made per sync round
3. Consider if budget of 20 requests/minute is too high for single function execution
4. Check if database writes are batched efficiently

### 4. Potential Solutions

#### Option A: Reduce Requests Per Sync Round

Currently using all 20 requests per minute. Could reduce to 5-10 to ensure function completes within timeout.

**Changes needed**:

- Adjust budget in `syncUser.ts` or make it configurable
- Set lower budget for production environment

#### Option B: Increase Function Timeout

Vercel Pro plan allows up to 60s timeout (free tier is 10s, serverless functions default to 10-60s depending on plan).

**Investigation needed**:

- Check current Vercel plan
- Check current timeout configuration in `vercel.json`
- Determine if we can/should increase timeout

#### Option C: Split Sync Into Smaller Chunks

Instead of syncing until budget exhausted, sync N pages then exit, allowing next cron trigger to continue.

**Changes needed**:

- Add max pages per sync limit
- Ensure cursor properly saved after each page
- May require more frequent cron triggers

#### Option D: Keep Override Temporarily

Since inbox was consuming all budget and preventing library from starting, keep `READWISE_SYNC_LOCATION_OVERRIDE` set until all locations complete initial sync, then remove it.

**Rationale**:

- Inbox has small number of docs (184) but was using full budget
- Library has most documents (1,487 in Readwise)
- Get library synced first, then re-enable inbox

### 5. Check Vercel Configuration

Review `vercel.json` (if it exists) or project settings:

```bash
# Check if vercel.json exists
cat vercel.json

# Check Vercel project settings
npx vercel inspect
```

Look for:

- `maxDuration` setting for API routes
- Current plan limits
- Function memory allocation

### 6. Monitor Sync Progress

Set up temporary monitoring to track sync progress:

**Option A**: Manual polling

```bash
# Run every minute to watch progress
watch -n 60 'curl -s "https://rsvp-reader-gray.vercel.app/api/sync/readwise?token=D84C2663-B231-4265-B364-629BE626F208"'
```

**Option B**: Add progress logging
Temporarily add more detailed console.log statements to sync function:

- Log at start of each location sync
- Log after each page fetched
- Log cursor updates
- Log budget consumption

### 7. Verify All Views Populate

Once sync completes (all cursors have timestamps):

1. **Library/Later view**: Should show 1,487 documents (or close to it)
2. **Feed view**: Should show documents with proper seen/unseen classification
3. **Archive view**: Should show archived documents
4. **Inbox view**: Re-enable in override and verify it doesn't block other locations

## Commands Reference

### Trigger Manual Sync

```bash
curl -s "https://rsvp-reader-gray.vercel.app/api/sync/readwise?token=D84C2663-B231-4265-B364-629BE626F208"
```

### Watch Vercel Logs (Real-time)

```bash
npx vercel logs rsvp-reader-gray.vercel.app
```

### Check Sync State

```sql
-- In Supabase SQL Editor
SELECT * FROM readwise_sync_state
WHERE user_id = '486cfa76-4fcd-4ac0-870e-f06e4486d7c8';
```

### Check Document Counts

```sql
-- In Supabase SQL Editor
SELECT location, COUNT(*) as count,
       COUNT(CASE WHEN first_opened_at IS NULL THEN 1 END) as unseen_count
FROM cached_documents
WHERE user_id = '486cfa76-4fcd-4ac0-870e-f06e4486d7c8'
GROUP BY location;
```

## Technical Details

### Key Files

- `src/app/api/sync/readwise/route.ts`: Cron endpoint that triggers sync
- `src/lib/sync/syncUser.ts`: Core sync orchestration logic
- `src/lib/sync/syncLocation.ts`: Individual location sync logic

### Environment Variables (Production)

- `SYNC_API_KEY`: D84C2663-B231-4265-B364-629BE626F208
- `READWISE_SYNC_LOCATION_OVERRIDE`: 'later,archive,feed' (currently set to skip inbox)
- `SUPABASE_SECRET_KEY`: (configured in Vercel)
- `ENCRYPTION_KEY`: (configured in Vercel)

### Sync State Schema

```typescript
{
  user_id: string;
  library_cursor: string | null; // null = not started, page:... = in progress, ISO = complete
  inbox_cursor: string | null;
  feed_cursor: string | null;
  archive_cursor: string | null;
  shortlist_cursor: string | null;
  in_progress: boolean;
  lock_acquired_at: string | null;
  next_allowed_at: string | null; // Rate limit window
  last_sync_at: string | null;
  window_request_count: number; // Budget tracking
  window_started_at: string | null;
  last_429_at: string | null;
}
```

## Fix Applied (2026-02-03)

### Root Cause

Individual DB upserts for each document caused 200 round trips per page. With 20 pages per sync, that's 4000 DB operations, hitting Supabase's 5-minute statement timeout.

### Solution Implemented (commit b7b6036)

1. **Batch upserts**: Collect all docs from a page and batch upsert (2 DB ops per page instead of 200)
2. **Configurable budget**: Added `READWISE_SYNC_MAX_REQUESTS_OVERRIDE` env var
3. **Function timeout**: Set `maxDuration: 60` in vercel.json

### Next Steps

1. **Deploy**: Merge fix to main and deploy to Vercel
2. **Optional**: Set `READWISE_SYNC_MAX_REQUESTS_OVERRIDE=10` in Vercel if timeouts persist
3. **Trigger sync**: `curl "https://rsvp-reader-gray.vercel.app/api/sync/readwise?token=D84C2663-B231-4265-B364-629BE626F208"`
4. **Monitor**: Watch Vercel logs for batch upsert messages
5. **Verify**: Query database to check cursor progress
6. **Cleanup**: Remove `READWISE_SYNC_LOCATION_OVERRIDE` once all locations complete

## Questions to Answer

1. What is our current Vercel plan and function timeout limit?
2. Has `library_cursor` been updated after the successful sync?
3. How many documents are now in `cached_documents` for "later" location?
4. Should we keep the location override until initial sync completes?
5. What's the optimal request budget per sync to avoid timeouts?

## Success Criteria

- [ ] All sync cursors (library, archive, feed, shortlist) have timestamps (completed initial sync)
- [ ] Library view shows ~1,487 documents
- [ ] Feed view shows documents with correct seen/unseen classification
- [ ] Archive view shows archived documents
- [ ] Inbox sync can run without blocking other locations
- [ ] No serverless function timeouts
- [ ] Sync runs successfully on cron schedule
