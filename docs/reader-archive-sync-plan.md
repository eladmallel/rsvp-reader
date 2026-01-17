# Reader Archive Sync Plan

## User Stories

- As a reader, when I archive an item in Readwise Reader, it should be marked archived in RSVP Reader so it no longer appears by default.
- As a reader, I want the Library and Feed lists to hide archived items by default so I can focus on active reading items.
- As a reader, I want to archive an item from RSVP Reader and have that change reflected in Readwise Reader.
- As a reader, I want archived items to be discoverable (via a filter or view) so I can find them later if needed.

## Technical Design

### Data Model

- Add an `archived` boolean (or `location` enum including `archive`) on cached Reader documents.
- Store `archived_at` timestamp when the archive state changes, if useful for sorting or audit.
- Ensure cache sync reads and writes are idempotent.

### Sync Behavior (Cron)

- Use a dedicated archive sync endpoint and separate cron job definition so rate limits can be managed independently.
- On each archive cron run, fetch Reader documents with `location=archive` (or include location in full sync if needed by design).
- Diff against cached documents; set `archived=true` for any newly archived items.
- If a document transitions from archived to active in Reader, clear `archived`.
- Update local cache without forcing immediate UI refresh; UI should reflect cached state on next load.

### API Integration (Archive Action)

- Add endpoint to archive a document in Reader using `PATCH /api/v3/update/<id>/` with `location=archive`.
- After successful Reader update, update cached document locally (`archived=true` and `archived_at=now`).
- Handle failures with a user-visible error and do not flip local state on failure.

### UI Changes

- Default Library and Feed queries to `archived=false`.
- Add an "Archived" filter or toggle to show archived items when needed.
- Indicate archived state in list item metadata when visible.

### Edge Cases

- Items deleted in Reader should not reappear; ensure sync ignores missing items or marks as deleted if tracked.
- Rate limits: batch updates and respect Reader API limits.
- Offline behavior: queue archive action until back online, or disable with clear error.

## Test Plan

### Unit Tests

- Mapping of Reader document `location` to local `archived` state.
- Local cache update logic for archive/unarchive transitions.

### Integration Tests

- Cron sync sets `archived=true` when Reader reports `location=archive`.
- Archive API endpoint updates Reader and local cache on success.
- Archive API endpoint leaves local cache unchanged on failure.

### E2E Tests

- Archive from Reader (mocked sync) hides item in list by default.
- Archive from app updates Reader and item disappears from default list.
- Archived filter shows archived items after hiding by default.
