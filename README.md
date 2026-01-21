# RSVP Reader 📖⚡

A Spritz-style speed reading app with Readwise Reader integration. Read your saved articles faster by presenting words one at a time at a fixed focal point.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

This project has three types of tests:

| Type                  | Command                    | What it tests                |
| --------------------- | -------------------------- | ---------------------------- |
| **Unit Tests**        | `npm run test`             | Components, hooks, utilities |
| **Integration Tests** | `npm run test:integration` | Real Readwise API calls      |
| **E2E Tests**         | `npm run test:e2e`         | Full browser workflows       |

### Unit Tests

Fast tests that run in isolation with mocked dependencies.

```bash
# Run once
npm run test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Integration Tests

Tests that hit the **real Readwise API** to verify our client works correctly.

**Setup required**: Add your Readwise token to `.env.local`:

```bash
# Get your token from https://readwise.io/access_token
READWISE_ACCESS_TOKEN=your-token-here
```

Then run:

```bash
npm run test:integration
```

> ⚠️ **Rate limit**: Readwise allows 20 requests/minute. Wait 60 seconds between runs if you hit the limit.

### E2E Tests

Full browser tests using Playwright that test the complete user experience.

```bash
# Run all E2E tests
npm run test:e2e

# Run with Playwright UI (great for debugging)
npm run test:e2e:ui
```

### Run All Tests

Before committing, run everything:

```bash
npm run test && npm run test:e2e
```

---

## 🛠️ Development

### Code Quality

```bash
# Check for lint errors
npm run lint

# Fix lint errors automatically
npm run lint:fix

# Check TypeScript types
npm run type-check

# Format code with Prettier
npm run format
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable                        | Description           | Where to get it                                           |
| ------------------------------- | --------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL  | [Supabase Dashboard](https://supabase.com/dashboard)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key     | [Supabase Dashboard](https://supabase.com/dashboard)      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service key  | [Supabase Dashboard](https://supabase.com/dashboard)      |
| `READWISE_ACCESS_TOKEN`         | For integration tests | [Readwise Access Token](https://readwise.io/access_token) |

---

## 📦 Project Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── api/            # API routes
│   ├── auth/           # Auth pages (login, signup, connect-reader)
│   └── rsvp/           # RSVP reading page
├── components/         # React components
│   ├── chat/           # Chat/AI components
│   ├── library/        # Article library components
│   ├── rsvp/           # RSVP player components
│   └── ui/             # Shared UI components
├── contexts/           # React contexts (theme, etc.)
└── lib/               # Utilities and business logic
    ├── reader/        # Readwise API client
    ├── rsvp/          # RSVP algorithms (ORP, timing, tokenizer)
    └── rtl/           # Right-to-left text support

tests/
└── e2e/               # Playwright E2E tests
```

---

## 🚀 Deployment

The app deploys automatically to Vercel on push to `main`.

Manual deployment:

```bash
npm run build
```

---

## 🔄 Syncing Readwise Content

The app syncs your Readwise Reader content into a local database for fast access. This is done via a dedicated API endpoint.

### Prerequisites

Set the `SYNC_API_KEY` environment variable in your `.env.local` file:

```bash
SYNC_API_KEY=your-secret-sync-key
```

This key protects the sync endpoint from unauthorized access.

### Manual Sync (via curl)

Trigger a one-time sync using curl:

```bash
# Using query parameter
curl "http://localhost:3000/api/sync/readwise?token=your-secret-sync-key"

# Or using header
curl -H "x-readwise-sync-secret: your-secret-sync-key" \
  "http://localhost:3000/api/sync/readwise"
```

For production/Vercel deployments, replace `http://localhost:3000` with your deployed URL.

### Automated Sync (via cron script)

For continuous syncing, use the provided script [`scripts/run-readwise-sync-cron.sh`](./scripts/run-readwise-sync-cron.sh):

```bash
# Set required environment variables
export SYNC_URL="http://localhost:3000/api/sync/readwise?token=your-secret-sync-key"
export SYNC_INTERVAL_SECONDS=60  # Optional, defaults to 60

# Run the cron loop
./scripts/run-readwise-sync-cron.sh
```

**How it works:**

1. The script runs in an infinite loop
2. Every `SYNC_INTERVAL_SECONDS` (default: 60), it calls the sync endpoint
3. The sync respects Readwise's rate limit (20 requests/minute) and handles pagination automatically
4. New and updated documents are cached in the database

> 💡 **Tip**: Run this script as a background process or in a separate terminal tab during development.

---

## 📚 Documentation

- **[Project Plan](./docs/PROJECT_PLAN.md)** - Full project spec and task breakdown
- **[Agent Guidelines](./AGENTS.md)** - AI agent working guidelines
- **[Open Questions](./OPEN_QUESTIONS.md)** - Tracked uncertainties and decisions
