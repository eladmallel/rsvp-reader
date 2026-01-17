# Working Memory: Readwise Sync Reliability

## Objective

Diagnose and fix Readwise sync/cron issues so the app consistently shows the latest Reader data.

## Current Status

Implemented inbox sync, improved sorting fields, and adjusted cron schedule. Pending verification.

## Key Context

- Sync runs via `/api/sync/readwise` with per-user state in `readwise_sync_state`.
- Vercel cron schedule is currently `0 12 * * *` (daily).
- Reader UI screenshot shows latest items in Inbox/Library that are missing from the app.

## Decisions Made

| Decision                                               | Rationale                                               |
| ------------------------------------------------------ | ------------------------------------------------------- |
| Sync inbox (`location=new`) alongside `later` + `feed` | Matches Reader's Inbox and avoids missing newest items. |
| Sort Library by `last_moved_at`/`updated_at`           | Aligns with Reader "Date moved" ordering.               |

## Next Steps

1. [x] Audit sync logic and document/order fields used for "latest" data.
2. [x] Simplify cursor handling and fix incremental fetch edge cases.
3. [x] Ensure cron schedule and observability confirm sync is running.
4. [x] Update tests/docs/tasks accordingly.

## Notes

- Reader API supports `withHtmlContent=true` and `updatedAfter` filters.
