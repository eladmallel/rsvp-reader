# Readwise Reader API Exploration

Source docs: https://readwise.io/reader_api (fetched 2026-01-16)

## Document LIST Endpoint (docs summary)

Request: `GET https://readwise.io/api/v3/list/`

Query params (from docs page):

- `id` (string): return single document by id.
- `updatedAfter` (string, ISO 8601): return documents updated after this time.
- `location` (string): `new`, `later`, `shortlist`, `archive`, `feed`.
- `category` (string): `article`, `email`, `rss`, `highlight`, `note`, `pdf`, `epub`, `tweet`, `video`.
- `tag` (string): tag key; supports up to 5 `tag` params; empty `?tag=` returns untagged.
- `limit` (int): 1..100, default 100.
- `pageCursor` (string): use to fetch the next page.
- `withHtmlContent` (boolean): include `html_content` in each document.
- `withRawSourceUrl` (boolean): include `raw_source_url`.

Pagination:

- Response includes `nextPageCursor` when more results exist.
- Use `pageCursor=<nextPageCursor>` for the next page.

Rate limiting (docs):

- 20 req/min per access token for read endpoints.
- 50 req/min per token for create/update.
- `429` responses include `Retry-After` seconds.

## Observed Patterns (200 docs sampled)

- `title` and `source_url` can be null; `url` appears consistently present.
- `location` can be null on some items (likely non-standard categories).
- Categories observed beyond the docs list: `note`, `podcast`, plus `highlight`.
- `tags` can be an object map or null; empty object is common.
- `content` is present but null unless HTML is requested.
- `withHtmlContent=true` returns `html_content` in each document.
- `limit` is honored; `page_size` is ignored (returns default 100).

## Live API Calls

Note: Requests below were executed against the live API with a token (not shown).

### 1) Basic list (no filters)

Request:

```bash
curl -sS https://readwise.io/api/v3/list/ \
  -H "Authorization: Token $READWISE_TOKEN"
```

Response:

```json
{
  "count": 2367,
  "nextPageCursor": "01kf4s8cfwvggz29hhfhyda2ms",
  "results": [
    {
      "id": "01kf4s8cfwvggz29hhfhyda2ms",
      "url": "https://read.readwise.io/read/01kf4s8cfwvggz29hhfhyda2ms",
      "title": "Two modes of storytelling: Studio and Newsroom",
      "author": "Akshay Kothari",
      "source": "Reader add from clipboard",
      "category": "tweet",
      "location": "new",
      "tags": {
        "writing": { "name": "writing", "type": "manual", "created": 1768613498536 },
        "marketing": { "name": "marketing", "type": "manual", "created": 1768613497831 }
      },
      "site_name": "X (formerly Twitter)",
      "word_count": 701,
      "reading_time": "3 mins",
      "created_at": "2026-01-17T01:31:31.217164+00:00",
      "updated_at": "2026-01-17T01:31:44.001401+00:00",
      "published_date": "2026-01-16",
      "summary": "There are two main ways to tell stories: slow and thoughtful (studio mode) or fast and timely (newsroom mode). Both are important but have risks if used alone. The best storytellers switch between these modes to stay deep and relevant.",
      "image_url": "https://pbs.twimg.com/profile_images/1911885165221023744/3knSxXxW.jpg",
      "content": null,
      "source_url": "https://x.com/akothari/status/2011974892007325980/?s=46&t=yeVCQbYaKXCy5LPHR5y__g&rw_tt_thread=True",
      "notes": "",
      "parent_id": null,
      "reading_progress": 0,
      "first_opened_at": "2026-01-17T01:31:41.088000+00:00",
      "last_opened_at": "2026-01-17T01:31:41.088000+00:00",
      "saved_at": "2026-01-17T01:31:31.195000+00:00",
      "last_moved_at": "2026-01-17T01:31:31.195000+00:00"
    }
  ]
}
```

### 2) List with HTML content

Request:

```bash
curl -sS "https://readwise.io/api/v3/list/?withHtmlContent=true&limit=5" \
  -H "Authorization: Token $READWISE_TOKEN"
```

Response:

```json
{
  "count": 2367,
  "nextPageCursor": "01kf4s8cfwvggz29hhfhyda2ms",
  "results": [
    {
      "id": "01kf4s8cfwvggz29hhfhyda2ms",
      "url": "https://read.readwise.io/read/01kf4s8cfwvggz29hhfhyda2ms",
      "title": "Two modes of storytelling: Studio and Newsroom",
      "author": "Akshay Kothari",
      "source": "Reader add from clipboard",
      "category": "tweet",
      "location": "new",
      "tags": {
        "writing": { "name": "writing", "type": "manual", "created": 1768613498536 },
        "marketing": { "name": "marketing", "type": "manual", "created": 1768613497831 }
      },
      "site_name": "X (formerly Twitter)",
      "word_count": 701,
      "reading_time": "3 mins",
      "created_at": "2026-01-17T01:31:31.217164+00:00",
      "updated_at": "2026-01-17T01:31:44.001401+00:00",
      "published_date": "2026-01-16",
      "summary": "There are two main ways to tell stories: slow and thoughtful (studio mode) or fast and timely (newsroom mode). Both are important but have risks if used alone. The best storytellers switch between these modes to stay deep and relevant.",
      "image_url": "https://pbs.twimg.com/profile_images/1911885165221023744/3knSxXxW.jpg",
      "content": null,
      "source_url": "https://x.com/akothari/status/2011974892007325980/?s=46&t=yeVCQbYaKXCy5LPHR5y__g&rw_tt_thread=True",
      "notes": "",
      "parent_id": null,
      "reading_progress": 0,
      "first_opened_at": "2026-01-17T01:31:41.088000+00:00",
      "last_opened_at": "2026-01-17T01:31:41.088000+00:00",
      "saved_at": "2026-01-17T01:31:31.195000+00:00",
      "last_moved_at": "2026-01-17T01:31:31.195000+00:00",
      "html_content": "<div><p data-rw-toc-level=\"1\" data-rw-toc-title=\"Two modes of storytelling: Studio and Newsroom\">I\u2019ve been spending the last few months trying to understand how storytelling works. Coming from the world of product &amp; engineering, I naturally started to look for systems underneath the outcomes. One thing I've noticed: most stories that break through tend to operate in one of two modes, and the best operators know how to move between them.</p><p>The first is what I\u2019d call\u00a0<em>studio mode</em>. This is slow, deliberate storytelling. You spend real time thinking and refining. The output is rare and intentional. These pieces usually carry a clear and novel point of view. They feel complete because they\u2019re coherent. The world tends to reward this mode when the craft is high and the perspective feels earned.</p><p>The second is\u00a0<em>newsroom mode</em>. This is fast, responsive storytelling that engages with conversations already in motion. Timing matters more than perfection. You\u2019re paying attention to what people are talking about right now and deciding whether you have something meaningful to add. The goal is to say the right thing while the moment still exists.</p><p>Each mode, in isolation, has a clear failure case. Studio mode often fails when it becomes too inward-looking. You can spend months perfecting an idea that never intersects with what anyone else cares about. The work may be thoughtful and well-crafted, but it misses its moment. Newsroom mode fails in the opposite way. When everything is reactive, identity erodes. You end up talking about many things without ever standing for something. The output is frequent, but the signal gets lost.</p><p><h2>Moving between modes</h2><br>We've been experimenting with both of these modes at Notion. My co-founder @ivanhzhao's recent essay, \u201cSteam, Steel, and Infinite Minds,\u201d is a clean example of studio mode. It took months to get right and explored a large, unresolved question about AI and the future of human work. It started quietly, then gained momentum as people shared it over and over again. The piece worked because it paired deep craft with questions the world was already circling, even if it wasn\u2019t shouting about it yet.</p><p>But not every story takes months. Earlier this month, there was a sudden burst of conversation around the \"Ralph Wiggum technique\" for running coding agents on Twitter. We noticed that the entire setup relied on Kanban boards -- one of the primitives we have in @NotionHQ, and we had a hunch that someone inside of Notion was playing around with this idea. Sure enough, @geoffreylitt had tinkered with this workflow over the break. Instead of overthinking it, he quickly made a compelling demo video and shared a tutorial on his workflow. It was fast, authentic, and grounded in the moment. It took off because it met people where they already were.</p><p><h2></h2><br><h2>Case study: Stripe</h2><br>It\u2019s not just Notion, I see this pattern playing out across some of my favorite storytelling brands, like Stripe. Stripe Press, led by @tamarawinter, is the epitome of Studio mode: print books that aim to be timeless \"ideas for progress\", with each book taking months or even years to produce. </p><p>But Stripe also has a newsroom muscle. If you've spent any time on \"fintwit\" and fintech Twitter over the last decade, you've probably gotten some wisdom and interesting takes from recognizable Stripe-affiliated voices, like @patio11 and @jeff_weinstein.</p><p>Or think about Stripe's incredible interactive \"<a href=\"https://x.com/stripe/status/1994446590912688536\" rel=\"nofollow\">Stripe City</a>\" for last year's Black Friday -- the craft of studio mode combined with the timeliness of newsroom mode.</p><p><img alt=\"\" src=\"https://pbs.twimg.com/media/G-v0p1ibQAI7goF.png\"></p><p><h2>Finding your balance</h2><br>For individuals, there isn\u2019t a single correct ratio between these modes, but most people tend to default toward one. Sometimes it looks like spending 80 percent of your time in studio mode, guided by awareness of what\u2019s happening in the newsroom. Other times it\u2019s the reverse, with most of your energy focused on timely responses, supported by just enough craft to make them meaningful.</p><p>I'm also learning how the two modes feed each other. Newsroom moments influence what the studio chooses to build next. Strong studio work can create entirely new cycles of conversation that the newsroom then amplifies. Over time, this creates a loop, where the studio gives you depth and the newsroom gives you relevance, and each cycle refines your intuition on which stories will sing.<br></p></div>"
    }
  ]
}
```

### 3) Pagination (pageCursor)

Request:

```bash
curl -sS "https://readwise.io/api/v3/list/?limit=5" \
  -H "Authorization: Token $READWISE_TOKEN"
```

Follow-up (if `nextPageCursor` exists):

```bash
curl -sS "https://readwise.io/api/v3/list/?limit=5&pageCursor=<cursor>" \
  -H "Authorization: Token $READWISE_TOKEN"
```

Response:

```json
{
  "count": 2366,
  "nextPageCursor": "01kf4qpvmsgv35zrmkbk17chjn",
  "results": [
    {
      "id": "01kf4qpvmsgv35zrmkbk17chjn",
      "url": "https://read.readwise.io/read/01kf4qpvmsgv35zrmkbk17chjn",
      "title": "How to articulate yourself intelligently",
      "author": "DAN KOE",
      "source": "Reader add from clipboard",
      "category": "tweet",
      "location": "archive",
      "tags": {
        "writing": { "name": "writing", "type": "manual", "created": 1768612980718 },
        "marketing": { "name": "marketing", "type": "manual", "created": 1768612984012 }
      },
      "site_name": "X (formerly Twitter)",
      "word_count": 3031,
      "reading_time": "12 mins",
      "created_at": "2026-01-17T01:04:28.335531+00:00",
      "updated_at": "2026-01-17T01:31:30.577957+00:00",
      "published_date": "2026-01-15",
      "summary": "To speak or write clearly, first gather your 8-10 best ideas and practice sharing them confidently. Start by writing regularly to organize your thoughts and get feedback. Then, use structured frameworks like the Pyramid Principle or cross-domain thinking to make your points strong and interesting.",
      "image_url": "https://pbs.twimg.com/profile_images/1845856303174037504/Q7ZZqVFa.jpg",
      "content": null,
      "source_url": "https://x.com/thedankoe/status/2011827303962329458/?s=46&t=yeVCQbYaKXCy5LPHR5y__g&rw_tt_thread=True",
      "notes": "",
      "parent_id": null,
      "reading_progress": 1,
      "first_opened_at": "2026-01-17T01:04:32.143000+00:00",
      "last_opened_at": "2026-01-17T01:13:55.240000+00:00",
      "saved_at": "2026-01-17T01:04:28.313000+00:00",
      "last_moved_at": "2026-01-17T01:31:29.019000+00:00"
    }
  ]
}
```

### 4) Incremental sync (updatedAfter)

Request:

```bash
curl -sS "https://readwise.io/api/v3/list/?updatedAfter=2026-01-01T00:00:00Z&limit=5" \
  -H "Authorization: Token $READWISE_TOKEN"
```

Response:

```json
{
  "count": 2,
  "nextPageCursor": "01kf4s8cfwvggz29hhfhyda2ms",
  "results": [
    {
      "id": "01kf4s8cfwvggz29hhfhyda2ms",
      "url": "https://read.readwise.io/read/01kf4s8cfwvggz29hhfhyda2ms",
      "title": "Two modes of storytelling: Studio and Newsroom",
      "author": "Akshay Kothari",
      "source": "Reader add from clipboard",
      "category": "tweet",
      "location": "new",
      "tags": {
        "writing": { "name": "writing", "type": "manual", "created": 1768613498536 },
        "marketing": { "name": "marketing", "type": "manual", "created": 1768613497831 }
      },
      "site_name": "X (formerly Twitter)",
      "word_count": 701,
      "reading_time": "3 mins",
      "created_at": "2026-01-17T01:31:31.217164+00:00",
      "updated_at": "2026-01-17T01:31:44.001401+00:00",
      "published_date": "2026-01-16",
      "summary": "There are two main ways to tell stories: slow and thoughtful (studio mode) or fast and timely (newsroom mode). Both are important but have risks if used alone. The best storytellers switch between these modes to stay deep and relevant.",
      "image_url": "https://pbs.twimg.com/profile_images/1911885165221023744/3knSxXxW.jpg",
      "content": null,
      "source_url": "https://x.com/akothari/status/2011974892007325980/?s=46&t=yeVCQbYaKXCy5LPHR5y__g&rw_tt_thread=True",
      "notes": "",
      "parent_id": null,
      "reading_progress": 0,
      "first_opened_at": "2026-01-17T01:31:41.088000+00:00",
      "last_opened_at": "2026-01-17T01:31:41.088000+00:00",
      "saved_at": "2026-01-17T01:31:31.195000+00:00",
      "last_moved_at": "2026-01-17T01:31:31.195000+00:00"
    }
  ]
}
```

### 5) Filter by location=feed

Request:

```bash
curl -sS "https://readwise.io/api/v3/list/?location=feed&limit=1" \
  -H "Authorization: Token $READWISE_TOKEN"
```

Response:

```json
{
  "count": 350,
  "nextPageCursor": "01kf4kq1j7ftt8f321fa477k74",
  "results": [
    {
      "id": "01kf4kq1j7ftt8f321fa477k74",
      "url": "https://read.readwise.io/read/01kf4kq1j7ftt8f321fa477k74",
      "title": "Investing and PE Twitter List: January 16, 2026 PM Edition",
      "author": "Elad Mallel ⌐◨-◨",
      "source": "Reader RSS",
      "category": "rss",
      "location": "feed",
      "tags": {},
      "site_name": "X (formerly Twitter)",
      "word_count": 5490,
      "reading_time": "21 mins",
      "created_at": "2026-01-16T23:54:40.078482+00:00",
      "updated_at": "2026-01-16T23:54:42.132460+00:00",
      "published_date": "2026-01-16",
      "summary": "Tweets from Brian Feroldi, SMB Attorney, Michael A. Arouet, acquire.com, Nick Huber, and more!",
      "image_url": "https://abs.twimg.com/responsive-web/client-web-legacy/icon-svg.168b89da.svg",
      "content": null,
      "source_url": "https://twitter.com/i/lists/1830359619727970545?ts=1768607678.397581",
      "notes": "",
      "parent_id": null,
      "reading_progress": 0,
      "first_opened_at": null,
      "last_opened_at": null,
      "saved_at": "2026-01-16T23:54:37.072000+00:00",
      "last_moved_at": "2026-01-16T23:54:37.072000+00:00"
    }
  ]
}
```
