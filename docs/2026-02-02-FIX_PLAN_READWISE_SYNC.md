# Fix Plan: Readwise Sync for All Views

> **Status**: IMPLEMENTED (Phases 1-5 complete)
> **Created**: 2026-02-02
> **Implemented**: 2026-02-02

---

## Problem Statement

| View              | Status                        | Root Cause                                      |
| ----------------- | ----------------------------- | ----------------------------------------------- |
| Library / Inbox   | Works ✅                      | -                                               |
| Library / Later   | Partial (98 of 1,487 docs) ❌ | Root Cause #1: Sync cursor bug                  |
| Library / Archive | Empty ❌                      | Root Cause #1: Sync never reaches this location |
| Feed / Unseen     | Empty ❌                      | Root Cause #1 + #2                              |
| Feed / Seen       | Empty ❌                      | Root Cause #1 + #2                              |

---

## Root Causes

### Root Cause #1: Sync Cursor Bug (Blocks ALL locations after inbox)

**Impact**: Library/Later stuck at 98 docs. Archive, Feed, Shortlist never sync.

**Evidence from database:**

```
cached_documents by location:
  new:     178 docs ✅
  later:    98 docs ❌ (API has 1,487!)
  archive:   0 docs ❌
  feed:      0 docs ❌

sync_state:
  inbox_cursor:    "2026-02-02T03:02:51..." (timestamp = COMPLETE)
  library_cursor:  null                     ❌ (should be page cursor!)
  archive_cursor:  null
  feed_cursor:     null
  initial_backfill_done: false
```

**Bug location**: `src/lib/sync/syncUser.ts` lines 548-553

```typescript
if (deferredForBudget) {
  return {
    nextCursor: cursorValue, // ← BUG: Returns null instead of pageCursor
    latestUpdatedAt,
    completed: false,
  };
}
```

**What happens:**

1. Sync fetches first page of `later` (98 docs)
2. Budget runs out mid-page processing
3. Returns original `cursorValue` (null) instead of current `pageCursor`
4. Next sync: `library_cursor` is null → thinks `later` hasn't started
5. Re-syncs the same first page forever
6. Sync processes locations sequentially: `inbox → later → archive → feed`
7. Since `later` never completes, `archive` and `feed` never start

---

### Root Cause #2: Feed Seen/Unseen Uses Wrong Field

**Impact**: Even if Feed synced, seen/unseen classification would be wrong.

|        | Current (Wrong)          | Correct                    |
| ------ | ------------------------ | -------------------------- |
| Field  | `reading_progress`       | `first_opened_at`          |
| Unseen | `reading_progress === 0` | `first_opened_at === null` |
| Seen   | `reading_progress > 0`   | `first_opened_at !== null` |

Readwise uses `first_opened_at` to track if user has "seen" a document. A document can be opened (seen) without making reading progress.

**Bug location**: `src/app/(main)/feed/page.tsx` line 60

```typescript
isUnread: doc.readingProgress === 0,  // WRONG
```

---

### Root Cause #3: Missing Database Columns

**Impact**: Can't store or use `first_opened_at` for classification.

The `cached_documents` table is missing:

- `first_opened_at` - CRITICAL for Feed seen/unseen
- `last_opened_at` - Useful for sorting

The sync code doesn't store these fields even though the API returns them.

---

### Root Cause #4: Highlights Not Filtered

**Impact**: Documents with `location: null` (highlights) could appear in views.

Highlights are child documents with:

- `category: "highlight"`
- `location: null`
- `parent_id` pointing to parent document

**We do not support highlights**. They must be filtered out from all views.

---

## Implementation Plan

### Phase 1: Fix Sync Cursor Bug

**Addresses**: Root Cause #1

**File**: `src/lib/sync/syncUser.ts`

**Change** (lines 548-553):

```typescript
// BEFORE (bug)
if (deferredForBudget) {
  return {
    nextCursor: cursorValue,
    latestUpdatedAt,
    completed: false,
  };
}

// AFTER (fix)
if (deferredForBudget) {
  return {
    nextCursor: pageCursor ? formatPageCursor(pageCursor, updatedAfter) : cursorValue,
    latestUpdatedAt,
    completed: false,
  };
}
```

---

### Phase 2: Add Database Columns

**Addresses**: Root Cause #3

**File**: New migration `supabase/migrations/20260202000000_add_opened_at_columns.sql`

```sql
ALTER TABLE cached_documents
ADD COLUMN first_opened_at TIMESTAMPTZ,
ADD COLUMN last_opened_at TIMESTAMPTZ;

CREATE INDEX idx_cached_documents_first_opened
ON cached_documents(user_id, location, first_opened_at);
```

---

### Phase 3: Store `first_opened_at` During Sync

**Addresses**: Root Cause #3

**File**: `src/lib/sync/syncUser.ts`

**Change**: Add to the upsert object (around line 512-539):

```typescript
first_opened_at: doc.first_opened_at,
last_opened_at: doc.last_opened_at,
```

---

### Phase 4: Update API Route

**Addresses**: Root Cause #3, #4

**File**: `src/app/api/reader/documents/route.ts`

1. Include `first_opened_at` and `last_opened_at` in SELECT
2. Return these fields in response
3. **Filter out highlights**: Add `WHERE category != 'highlight'` to all queries

---

### Phase 5: Fix Feed Seen/Unseen Classification

**Addresses**: Root Cause #2

**File**: `src/app/(main)/feed/page.tsx`

1. Update interface:

```typescript
interface DocumentFromApi {
  // ... existing fields ...
  firstOpenedAt: string | null;
}
```

2. Fix classification:

```typescript
isUnread: doc.firstOpenedAt === null,  // Changed from readingProgress
```

---

### Phase 6: Reset Sync State & Trigger Full Resync

**Addresses**: All root causes (gets fresh data with fixes applied)

After deploying fixes:

1. Reset `initial_backfill_done` to `false` for all users
2. Clear all cursors
3. Trigger fresh sync to repopulate with correct data

---

## Files to Modify

| File                                                           | Changes                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/lib/sync/syncUser.ts`                                     | Fix cursor bug + store `first_opened_at`, `last_opened_at` |
| `supabase/migrations/20260202000000_add_opened_at_columns.sql` | New migration                                              |
| `src/app/api/reader/documents/route.ts`                        | Return new fields + filter highlights                      |
| `src/app/(main)/feed/page.tsx`                                 | Use `firstOpenedAt` for seen/unseen                        |
| `src/lib/supabase/types.ts`                                    | Regenerate after migration                                 |

---

## Verification Checklist

After implementation (verify after deploying & running migration):

- [x] Sync cursor bug fixed - `library_cursor` shows page cursor, not null (code implemented)
- [ ] Migration applied - `cached_documents` has `first_opened_at` column (needs deployment)
- [x] Sync stores `first_opened_at` values (code implemented)
- [x] API returns `firstOpenedAt` field (code implemented)
- [x] Highlights filtered out - no `category='highlight'` in any view (code implemented)
- [ ] Library/Later shows all 1,487 docs (not just 98) (needs deployment + resync)
- [ ] Library/Archive shows docs (needs deployment + resync)
- [ ] Feed/Unseen shows docs where `first_opened_at IS NULL` (needs deployment + resync)
- [ ] Feed/Seen shows docs where `first_opened_at IS NOT NULL` (needs deployment + resync)
- [ ] No regressions in Library/Inbox (needs deployment + resync)

---

## Rollback Plan

1. Migration is additive (new columns) - no data loss risk
2. Can revert code changes while keeping new columns
3. Old `reading_progress` logic can be restored as fallback
