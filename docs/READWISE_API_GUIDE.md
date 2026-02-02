# Readwise Reader API Guide

> **Purpose**: Definitive guide for using the Readwise Reader API to populate all navigation views in RSVP Reader.
>
> **Last Updated**: 2026-02-02
> **Verified Against**: Live Readwise Reader UI and API

---

## Overview

**API Base URL**: `https://readwise.io/api/v3/list/`

**Authentication**: `Authorization: Token <READWISE_ACCESS_TOKEN>`

**Rate Limits**:

- Read endpoints: 20 requests/minute
- Write endpoints: 50 requests/minute
- 429 responses include `Retry-After` header

---

## IMPORTANT: Filter Out Highlights

> **We do NOT support highlights in RSVP Reader at this time.**
>
> **Always filter out `category = 'highlight'` from all views.**

Highlights are child documents (annotations) attached to parent documents. They have:

- `category: "highlight"`
- `location: null`
- `parent_id` pointing to the parent document

Until highlight support is added, exclude them everywhere:

- During sync: skip or don't display documents where `category === 'highlight'`
- In API responses: filter them out
- In UI: never show them in Library or Feed views

---

## Navigation Views Mapping

This is the **definitive mapping** between our app's navigation views and Readwise API parameters.

| App View          | API `location` Param | Additional Filter                                        | Verified |
| ----------------- | -------------------- | -------------------------------------------------------- | -------- |
| Library / Inbox   | `new`                | `category !== 'highlight'`                               | ✅       |
| Library / Later   | `later`              | `category !== 'highlight'`                               | ✅       |
| Library / Archive | `archive`            | `category !== 'highlight'`                               | ✅       |
| Feed / Unseen     | `feed`               | `first_opened_at == null` AND `category !== 'highlight'` | ✅       |
| Feed / Seen       | `feed`               | `first_opened_at != null` AND `category !== 'highlight'` | ✅       |

### Critical Insight: Feed Seen vs Unseen

**The API does NOT have separate location values for Feed/Unseen vs Feed/Seen.**

Both use `location=feed`. The distinction is made by the `first_opened_at` field:

- **Unseen**: `first_opened_at` is `null` (user has never opened the document)
- **Seen**: `first_opened_at` is a timestamp (user has opened the document at least once)

**Implementation approach**:

1. Fetch all documents with `location=feed`
2. Filter client-side based on `first_opened_at` value

---

## API Query Parameters

| Parameter          | Type     | Description                                                                                                |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `id`               | string   | Return single document by ID                                                                               |
| `updatedAfter`     | ISO 8601 | Documents updated after this time (for incremental sync)                                                   |
| `location`         | string   | Filter by location: `new`, `later`, `shortlist`, `archive`, `feed`                                         |
| `category`         | string   | Filter by type: `article`, `email`, `rss`, `highlight`, `note`, `pdf`, `epub`, `tweet`, `video`, `podcast` |
| `tag`              | string   | Filter by tag (up to 5 `tag` params; empty `?tag=` returns untagged)                                       |
| `limit`            | int      | Results per page: 1-100, default 100                                                                       |
| `pageCursor`       | string   | Pagination cursor from previous response                                                                   |
| `withHtmlContent`  | boolean  | Include `html_content` in response                                                                         |
| `withRawSourceUrl` | boolean  | Include `raw_source_url` in response                                                                       |

---

## API Response Structure

```json
{
  "count": 2536,
  "nextPageCursor": "01kfrdjpv2jy9snc6wr74rqcxa",
  "results": [
    {
      "id": "01kgfxhkqdw46x87jtyzfd05fd",
      "url": "https://read.readwise.io/read/01kgfxhkqdw46x87jtyzfd05fd",
      "title": "Finding myself going back to RSS/Atom feeds...",
      "author": "Andrej Karpathy",
      "source": "Reader add from clipboard",
      "category": "tweet",
      "location": "new",
      "tags": {
        "dev": { "name": "dev", "type": "manual", "created": 1768613498536 }
      },
      "site_name": "X (formerly Twitter)",
      "word_count": 701,
      "reading_time": "3 mins",
      "created_at": "2026-01-17T01:31:31.217164+00:00",
      "updated_at": "2026-01-17T01:31:44.001401+00:00",
      "published_date": "2026-01-16",
      "summary": "Short summary of the content...",
      "image_url": "https://example.com/image.jpg",
      "content": null,
      "html_content": "<div>...</div>",
      "source_url": "https://x.com/karpathy/status/...",
      "notes": "",
      "parent_id": null,
      "reading_progress": 0,
      "first_opened_at": null,
      "last_opened_at": null,
      "saved_at": "2026-01-17T01:31:31.195000+00:00",
      "last_moved_at": "2026-01-17T01:31:31.195000+00:00"
    }
  ]
}
```

### Key Fields for Our App

| Field              | Type         | Description              | Used For           |
| ------------------ | ------------ | ------------------------ | ------------------ |
| `id`               | string       | Unique document ID       | Primary key        |
| `location`         | string       | Document location        | View filtering     |
| `first_opened_at`  | string\|null | When first opened        | Feed seen/unseen   |
| `reading_progress` | float        | 0-1 progress             | Progress display   |
| `category`         | string       | Document type            | Category filtering |
| `tags`             | object       | Tag map                  | Tag filtering      |
| `updated_at`       | string       | Last update time         | Incremental sync   |
| `html_content`     | string       | Full HTML (if requested) | Reading view       |

---

## Verified API Calls

### Library / Inbox

```bash
curl -sS "https://readwise.io/api/v3/list/?location=new&limit=100" \
  -H "Authorization: Token $READWISE_TOKEN"
```

**Response**: Documents where `location: "new"` (count: 180 at time of verification)

### Library / Later

```bash
curl -sS "https://readwise.io/api/v3/list/?location=later&limit=100" \
  -H "Authorization: Token $READWISE_TOKEN"
```

**Response**: Documents where `location: "later"` (count: 1,487 at time of verification)

### Library / Archive

```bash
curl -sS "https://readwise.io/api/v3/list/?location=archive&limit=100" \
  -H "Authorization: Token $READWISE_TOKEN"
```

**Response**: Documents where `location: "archive"` (count: 347 at time of verification)

### Feed (All Items)

```bash
curl -sS "https://readwise.io/api/v3/list/?location=feed&limit=100" \
  -H "Authorization: Token $READWISE_TOKEN"
```

**Response**: Documents where `location: "feed"` (count: 474 at time of verification)

**Then filter client-side**:

- **Unseen**: `results.filter(doc => doc.first_opened_at === null)`
- **Seen**: `results.filter(doc => doc.first_opened_at !== null)`

### Incremental Sync (updatedAfter)

```bash
curl -sS "https://readwise.io/api/v3/list/?updatedAfter=2026-02-01T00:00:00Z&limit=100" \
  -H "Authorization: Token $READWISE_TOKEN"
```

**Response**: All documents updated after the specified timestamp, regardless of location.

---

## Pagination

When `nextPageCursor` is present in the response, more results exist.

```bash
# First request
curl -sS "https://readwise.io/api/v3/list/?location=feed&limit=100" \
  -H "Authorization: Token $READWISE_TOKEN"
# Response: { "nextPageCursor": "01kf58mrf5h2y87g02ey17e1wp", ... }

# Next page
curl -sS "https://readwise.io/api/v3/list/?location=feed&limit=100&pageCursor=01kf58mrf5h2y87g02ey17e1wp" \
  -H "Authorization: Token $READWISE_TOKEN"
```

---

## Syncing Strategy

### Initial Sync (First Load)

Fetch documents by location in parallel (respecting rate limits):

```
1. GET ?location=new&limit=100     → Library/Inbox
2. GET ?location=later&limit=100   → Library/Later
3. GET ?location=archive&limit=100 → Library/Archive
4. GET ?location=feed&limit=100    → Feed (then filter by first_opened_at)
```

If any response has `nextPageCursor`, continue paginating.

### Incremental Sync (Subsequent Loads)

Use `updatedAfter` with the last sync timestamp:

```
GET ?updatedAfter=<last_sync_timestamp>&limit=100
```

This returns ALL updated documents across all locations. Then:

1. Update local database with new/changed documents
2. Re-classify into views based on `location` and `first_opened_at`

---

## Common Gotchas

### 1. Feed Seen/Unseen is NOT a Location

**Wrong**: `?location=feed_unseen` or `?location=feed_seen`
**Right**: `?location=feed` then filter by `first_opened_at`

### 2. Shortlist is NOT a Simple Location

The Shortlist view in Readwise UI uses a complex filter:

- URL: `/filter/tag:shortlist AND (in:inbox OR in:later)`
- API: `?location=shortlist` returns 0 results because it requires the "shortlist" tag

**For our app**: We can use `?location=shortlist` but it only works if documents have been explicitly added to shortlist.

### 3. Count May Differ from Results Length

The `count` field shows total matching documents, but `results` only contains up to `limit` documents.

### 4. Null vs Missing Fields

- `first_opened_at: null` means never opened (unseen)
- `location: null` occurs for **highlights** — always filter these out (see top of doc)
- `tags: {}` (empty object) is common; `tags: null` is rare

---

## References

- Readwise API Docs: https://readwise.io/reader_api
- Previous exploration: `docs/archive/2026-01/readwise-api-exploration.md`
- Screenshots: Located in scratchpad directory during investigation
