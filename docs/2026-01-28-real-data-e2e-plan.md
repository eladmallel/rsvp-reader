# Real Data E2E Test Redesign Plan

## Status Table (TODOs)

| ID  | Task                                                                           | Status          |
| --- | ------------------------------------------------------------------------------ | --------------- |
| 1   | Constrain Readwise sync to a single location/page for tests                    | [x] Complete    |
| 2   | Add test-only override for sync page size (`READWISE_SYNC_PAGE_SIZE_OVERRIDE`) | [x] Complete    |
| 3   | Seed `readwise_sync_state` to skip non-library locations and limit budget      | [ ] Not started |
| 4   | Trigger sync once and wait for cached DB rows                                  | [ ] Not started |
| 5   | Update Library + RSVP E2E tests to use cached DB data only                     | [ ] Not started |
| 6   | Implement stable, fast auth (UI login once + storageState reuse)               | [ ] Not started |
| 7   | Add cleanup for test user and cached rows                                      | [ ] Not started |

---

## Objective

Redesign `tests/e2e/integration-real-data.spec.ts` to match production behavior:

- **Only the sync flow talks to Readwise**
- **Library + RSVP UI reads from cached DB data only**
- **Minimal Readwise API calls** (single list call with HTML content)

## Confirmed Production Behavior

- `syncUser` calls `readerClient.listDocuments({ withHtmlContent: true })`.
- Sync caches metadata to `cached_documents` and content to `cached_articles`.
- `/api/reader/documents` reads **only** from `cached_documents`.
- `/api/reader/documents/:id` reads from cache first and only calls Readwise when cache is missing.

## Plan Details

### 1) Constrain Readwise Sync to Minimal Calls

Goal: **1 list call total** (no pagination, no follow-up doc calls).

Implementation:

- Seed `readwise_sync_state` so only **library/later** runs.
- Mark inbox/feed/archive/shortlist as complete (timestamps).
- Set `window_request_count` to `MAX_REQUESTS_PER_MINUTE - 1` to allow only **one request**.
- Override sync `page_size` to a small value (e.g., 10).

Result:

- **One Readwise list call with HTML content**.
- Caches enough data for both Library + RSVP tests.

### 2) Test-Only Sync Page Size Override

Add optional env: `READWISE_SYNC_PAGE_SIZE_OVERRIDE=10`.

- If set, `syncUser` uses this value instead of `DEFAULT_PAGE_SIZE`.
- Default remains unchanged for production (100 docs per page).

### 3) Minimal Sync Trigger

Use the sync endpoint in test setup:

- Create test user and seed state.
- Trigger `GET /api/sync/readwise?token=SYNC_API_KEY`.
- Poll DB for:
  - `readwise_sync_state.in_progress = false`
  - `cached_documents` rows
  - `cached_articles` rows with HTML

### 4) UI Tests Use Cached Data Only

- Library tests: load `/` and verify articles render from cache.
- RSVP tests: select an article ID from cached DB and navigate to `/rsvp?id=...`.
- Assert content is real (not demo text).
- No Readwise calls outside sync.

### 5) Auth Strategy (Fast + Stable)

Preferred approach: **UI login once** and reuse `storageState`:

- Login via UI on first test.
- Save Playwright storage state.
- Reuse for remaining tests.

Rationale: avoids brittle cookie injection and keeps tests stable.

### 6) Cleanup

- Delete test user.
- Remove cached rows for that user.

## Success Criteria

- Real data E2E suite runs with **1 Readwise API call**.
- Library + RSVP load from cache only.
- No flaky rate-limit behavior.
- CI runtime remains fast and stable.
