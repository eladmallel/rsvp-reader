# Working Memory: Readwise Sync Investigation

## Objective

Debug and fix the RSVP Reader app's data fetching from Readwise. The library view works but other views (library/later, library/archive, feed/unseen, feed/seen) are stale or empty.

## Task Summary

1. Use browser agent to explore Readwise Reader UI and understand their navigation
2. Use Readwise API to understand how each view maps to API parameters
3. Create documentation explaining correct API usage
4. Create a fix plan comparing current implementation vs correct approach

## Current Status

- [x] Save this prompt (this file)
- [x] Read AGENTS.md for context
- [x] Explore Readwise UI with browser agent
- [x] Make API calls to understand data model
- [x] Create Readwise API documentation
- [x] Create fix plan document
- [ ] Review with user before any code changes

## Key Findings from Investigation

### UI Navigation Structure (from browser exploration)

| UI Section      | URL Path                                           | Notes                             |
| --------------- | -------------------------------------------------- | --------------------------------- |
| Library/Inbox   | `/new`                                             | Default landing page              |
| Library/Later   | `/later`                                           | "Read later" items                |
| Library/Archive | `/archive`                                         | Archived items                    |
| Feed/Unseen     | `/feed/unseen`                                     | Default Feed view                 |
| Feed/Seen       | `/feed/seen`                                       | Previously opened feed items      |
| Shortlist       | `/filter/tag:shortlist AND (in:inbox OR in:later)` | Filter-based view, not a location |

### API Location Mapping

| App View        | API `location` Value | Additional Filter         |
| --------------- | -------------------- | ------------------------- |
| Library/Inbox   | `new`                | None                      |
| Library/Later   | `later`              | None                      |
| Library/Archive | `archive`            | None                      |
| Feed/Unseen     | `feed`               | `first_opened_at == null` |
| Feed/Seen       | `feed`               | `first_opened_at != null` |

### Key Insight: Feed Seen vs Unseen

**CRITICAL DISCOVERY**: The API does NOT have separate `location` values for Feed/Unseen vs Feed/Seen.

- Both are `location=feed`
- The distinction is made by the `first_opened_at` field:
  - **Unseen**: `first_opened_at` is `null`
  - **Seen**: `first_opened_at` is a timestamp

This means:

1. Fetch all `location=feed` documents
2. Filter client-side based on `first_opened_at`

### Document Counts (from API)

| Location      | Count |
| ------------- | ----- |
| `new` (inbox) | 180   |
| `later`       | 1,487 |
| `archive`     | 347   |
| `feed`        | 474   |
| `shortlist`   | 0     |

## API Call Log

| Time   | Call                            | Purpose            | Result                                |
| ------ | ------------------------------- | ------------------ | ------------------------------------- |
| ~15:25 | `?limit=100` (no filter)        | Get all docs       | 2536 total, mixed locations           |
| ~15:26 | `?location=later&limit=10`      | Test later         | 1487 count, works                     |
| ~15:27 | `?location=feed&limit=50`       | Test feed          | 474 count, all unseen in batch        |
| ~15:28 | `?location=archive&limit=10`    | Test archive       | 347 count, works                      |
| ~15:29 | `?location=new&limit=10`        | Test inbox         | 180 count, works                      |
| ~15:30 | `?location=shortlist&limit=10`  | Test shortlist     | 0 count                               |
| ~15:31 | `?location=feed&limit=100`      | Larger feed sample | All 100 unseen                        |
| ~15:32 | `?location=feed&pageCursor=...` | Older feed items   | Found seen items with first_opened_at |

**Total API calls: 8** (well under 20/min limit)

## Screenshots Captured

- `scratchpad/readwise-inbox.png` - Library/Inbox view
- `scratchpad/readwise-later.png` - Library/Later view
- `scratchpad/readwise-archive.png` - Library/Archive view
- `scratchpad/readwise-feed-unseen.png` - Feed/Unseen view
- `scratchpad/readwise-feed-seen.png` - Feed/Seen view
- `scratchpad/readwise-shortlist.png` - Shortlist view (empty)

## Next Steps

1. Update `docs/READWISE_API_GUIDE.md` with findings
2. Review our current implementation code
3. Update `docs/FIX_PLAN_READWISE_SYNC.md` with gap analysis
4. Present to user for review before any code changes
