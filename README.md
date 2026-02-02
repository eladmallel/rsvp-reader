# RSVP Reader

A Spritz-style speed reading app with Readwise Reader integration. Read your saved articles faster by presenting words one at a time at a fixed focal point.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Database Setup](#3-database-setup)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Syncing Readwise Content](#syncing-readwise-content)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

---

## Quick Start

For experienced developers who want to get running immediately:

```bash
# 1. Install dependencies
npm install

# 2. Set up Supabase locally (downloads Docker containers on first run)
npx supabase start

# 3. Copy environment templates
cp .env.example .env.development.local
cp .env.test.example .env.test

# 4. Fill in your production Supabase credentials in .env.development.local
# Get these from: https://supabase.com/dashboard/project/_/settings/api

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For first-time setup or detailed instructions, continue reading below.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20.x or later
- **npm** 9.x or later
- **Docker** (for local Supabase instance)
- **Supabase account** (free tier is fine) - [Sign up here](https://supabase.com)
- **Readwise account** (optional, for syncing articles) - [Sign up here](https://readwise.io)

---

## Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd rsvp-reader

# Install dependencies
npm install
```

### 2. Environment Configuration

This project uses separate environment files for different contexts:

| File                     | Purpose                             | When Used                                      |
| ------------------------ | ----------------------------------- | ---------------------------------------------- |
| `.env.development.local` | Production Supabase credentials     | Running the app locally (`npm run dev`)        |
| `.env.test`              | Local Supabase test instance        | Running tests (`npm test`, `npm run test:e2e`) |
| `.env.example`           | Template for production credentials | Reference only                                 |
| `.env.test.example`      | Template for test credentials       | Reference only                                 |

#### Set Up Production Environment

```bash
# Copy the template
cp .env.example .env.development.local

# Edit .env.development.local and fill in your values
```

**Required variables for `.env.development.local`:**

| Variable                               | Description                                   | Where to Get It                                                                  |
| -------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your Supabase project URL                     | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (sb*publishable*...) | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API Keys → New |
| `SUPABASE_SECRET_KEY`                  | Supabase secret key (sb*secret*...)           | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API Keys → New |
| `SYNC_API_KEY`                         | Secret key for sync endpoint                  | Generate with: `openssl rand -hex 32`                                            |

> **Note:** We use the new Supabase API key formats (`sb_publishable_...` and `sb_secret_...`) which support rotation without downtime. Legacy keys (`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`) are still supported for backward compatibility. See [Supabase API Keys Migration](https://github.com/orgs/supabase/discussions/29260) for details.

**Optional variables:**

```bash
# Readwise Reader API (get from https://readwise.io/access_token)
READWISE_ACCESS_TOKEN=your-production-readwise-token

# Rate limiting (defaults shown)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Set Up Test Environment

```bash
# Copy the template
cp .env.test.example .env.test
```

The `.env.test` file comes pre-configured with local Supabase credentials. You only need to add:

```bash
# Optional: For Readwise integration tests
# ⚠️ Use a SEPARATE test Readwise account, NOT your production account!
READWISE_ACCESS_TOKEN=your-test-readwise-token
```

**Test-only sync overrides:**

These environment variables are useful for E2E tests to reduce API calls and test runtime:

| Variable                           | Description                                              | Example |
| ---------------------------------- | -------------------------------------------------------- | ------- |
| `READWISE_SYNC_LOCATION_OVERRIDE`  | Comma-separated list of locations to sync (skips others) | `later` |
| `READWISE_SYNC_PAGE_SIZE_OVERRIDE` | Number of documents per API request (default: 100)       | `10`    |

```bash
# Example: Only sync library location with 10 docs per page
READWISE_SYNC_LOCATION_OVERRIDE=later
READWISE_SYNC_PAGE_SIZE_OVERRIDE=10
```

Valid sync locations: `new`, `later`, `feed`, `archive`, `shortlist`

### 3. Database Setup

#### Start Local Supabase

For development and testing, we use Supabase local development:

```bash
# First time: Downloads Docker images and starts services (takes a few minutes)
npx supabase start

# View status
npx supabase status
```

This creates a local PostgreSQL database with all migrations applied. The credentials are:

- **API URL**: `http://127.0.0.1:54321`
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio UI**: `http://127.0.0.1:54323` (database management interface)

#### Apply Migrations to Production

Once you've set up your production Supabase project:

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push migrations to production
npx supabase db push
```

---

## Development

### Running the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Code Quality Tools

```bash
# Linting
npm run lint              # Check for lint errors
npm run lint:fix          # Fix lint errors automatically

# Type checking
npm run type-check        # Check TypeScript types

# Formatting
npm run format            # Format code with Prettier
npm run format:check      # Check if code is formatted correctly
```

### Supabase Management

```bash
# Check status of local Supabase
npx supabase status

# Stop all services
npx supabase stop

# Reset database (WARNING: deletes all local data)
npx supabase db reset

# Open Supabase Studio (database management UI)
open http://127.0.0.1:54323
```

### Database Migrations

Migrations are located in `/supabase/migrations/` and are automatically applied when you start local Supabase.

```bash
# Create a new migration
npx supabase migration new migration_name

# Apply migrations to production
npx supabase db push

# Reset local database and re-apply all migrations
npx supabase db reset
```

---

## Testing

This project has comprehensive test coverage across three types of tests:

### Test Types Overview

| Type            | Command                    | What It Tests                | Environment                   |
| --------------- | -------------------------- | ---------------------------- | ----------------------------- |
| **Unit**        | `npm test`                 | Components, hooks, utilities | Mocked (jsdom)                |
| **Integration** | `npm run test:integration` | Readwise API client          | Real Readwise API             |
| **E2E**         | `npm run test:e2e`         | Full browser workflows       | Local Supabase + Real browser |

### Unit Tests

Fast, isolated tests that run in jsdom with mocked dependencies.

```bash
# Run all unit tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Unit tests are located next to the code they test (e.g., `Button.test.tsx` next to `Button.tsx`).

### Integration Tests

Tests that verify our Readwise API client works correctly by making real API calls.

**Setup Required:**

1. Create a **separate Readwise test account** (use email+test@domain.com)
2. Get your test token from https://readwise.io/access_token
3. Add to `.env.test`:

```bash
READWISE_ACCESS_TOKEN=your-test-readwise-token
```

**Run tests:**

```bash
npm run test:integration
```

**Important Notes:**

- Readwise rate limit: 20 requests/minute. Wait 60 seconds if you hit it.
- Always use a separate test account. Never use your production Readwise account.
- These tests will create/modify/delete documents in your Readwise account.

### E2E Tests

Full browser tests using Playwright. Tests run against a local Next.js dev server with local Supabase.

**Prerequisites:**

```bash
# Ensure Supabase is running
npx supabase start

# Verify .env.test exists
ls .env.test
```

**Run tests:**

```bash
# Run all E2E tests
npm run test:e2e

# Run with Playwright UI (great for debugging)
npm run test:e2e:ui

# Run specific test file
npm run test:e2e tests/e2e/auth.spec.ts

# Run with browser visible (headed mode)
npm run test:e2e -- --headed

# Run in debug mode
npm run test:e2e -- --debug
```

**Test Coverage:**

- 351 of 364 tests passing (96%)
- Coverage includes: authentication, library, search, RSVP reading, settings, chat, visual alignment
- 13 tests are intentionally skipped (Readwise integration tests when no token is provided)

**Environment Isolation:**

E2E tests use `.env.test` which points to local Supabase (`http://127.0.0.1:54321`). Your production data is never touched. See [docs/devops/e2e-test-environment-fixes.md](docs/devops/e2e-test-environment-fixes.md) for details.

**Optional: Enable Readwise Integration Tests**

To run the 12 Readwise integration E2E tests:

1. Add a valid test Readwise token to `.env.test`
2. Run: `npm run test:e2e tests/e2e/integration-real-data.spec.ts`

### Pre-Commit Checks

Before committing, run the full test suite:

```bash
npm test && npm run test:e2e
```

This is enforced by git hooks (Husky + lint-staged).

---

## Deployment

### Vercel (Recommended)

The app is configured for automatic deployment to Vercel.

**Automatic Deployment:**

Push to `main` branch triggers automatic deployment via GitHub integration.

**Manual Deployment:**

```bash
# Build the app locally (tests the build)
npm run build

# Deploy to Vercel (requires Vercel CLI)
npx vercel --prod
```

**Environment Variables:**

Set these in your Vercel project settings:

| Variable                               | Value                                     | Notes                                        |
| -------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your production Supabase URL              | From Supabase dashboard                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your publishable key (sb*publishable*...) | From Dashboard → API Keys → New              |
| `SUPABASE_SECRET_KEY`                  | Your secret key (sb*secret*...)           | **Secret** - from Dashboard → API Keys → New |
| `SYNC_API_KEY`                         | Generate with `openssl rand -hex 32`      | **Secret** - protects sync endpoint          |
| `READWISE_ACCESS_TOKEN`                | Your production Readwise token            | Optional - for sync functionality            |

**Automated Sync:**

The project includes a `vercel.json` configuration for daily automated Readwise sync:

```json
{
  "crons": [
    {
      "path": "/api/sync/readwise?token=$SYNC_API_KEY",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs daily at midnight (UTC).

### Other Platforms

The app is a standard Next.js application and can be deployed to any platform that supports Next.js:

- **Docker**: Build with `npm run build` and use `npm start`
- **Node.js Server**: Same as Docker
- **Netlify**: Use Next.js plugin
- **Cloudflare Pages**: Use Next.js compatibility mode

---

## Project Structure

```
rsvp-reader/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── reader/       # Readwise API proxies
│   │   │   ├── search/       # Search functionality
│   │   │   └── sync/         # Readwise sync endpoint
│   │   ├── auth/             # Auth pages (login, signup, connect)
│   │   ├── chat/             # AI chat interface
│   │   ├── rsvp/             # RSVP reading page
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Homepage (library)
│   ├── components/            # React components
│   │   ├── chat/             # Chat UI components
│   │   ├── library/          # Article library components
│   │   ├── rsvp/             # RSVP player components
│   │   └── ui/               # Shared UI primitives
│   ├── contexts/              # React contexts
│   │   └── ThemeContext.tsx  # Dark/light theme
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Core business logic
│   │   ├── reader/           # Readwise API client
│   │   ├── rsvp/             # RSVP algorithms
│   │   ├── rtl/              # RTL text support
│   │   ├── supabase/         # Supabase client setup
│   │   └── sync/             # Sync state management
│   ├── test/                  # Test utilities
│   └── types/                 # TypeScript types
├── tests/
│   └── e2e/                   # Playwright E2E tests
│       └── utils/            # Test utilities (Supabase helpers, etc.)
├── supabase/
│   ├── migrations/            # Database migrations
│   └── config.toml           # Supabase configuration
├── scripts/                   # Utility scripts
│   ├── run-e2e.ts            # E2E test runner
│   └── run-readwise-sync-cron.sh  # Manual sync cron
├── docs/                      # Project documentation
│   ├── devops/               # DevOps guides
│   ├── redesign/             # Design plans
│   └── working-memory/       # Active task docs
└── public/                    # Static assets
```

---

## Syncing Readwise Content

The app syncs your Readwise Reader library into a local Supabase database for fast access and offline reading. Sync happens via the `/api/sync/readwise` endpoint.

### How Sync Works

1. Calls Readwise Reader API to fetch new/updated documents
2. Stores documents in the `cached_documents` table in Supabase
3. Tracks sync state (last update cursor) to fetch only changes
4. Respects Readwise rate limits (20 requests/minute)

### Production Sync (Automated via Vercel Cron)

When deployed to Vercel, the app automatically syncs daily at midnight UTC via Vercel Cron (configured in `vercel.json`).

**No setup required** - just ensure `SYNC_API_KEY` and `READWISE_ACCESS_TOKEN` are set in Vercel environment variables.

### Development Sync (Manual)

For local development, you can trigger sync manually.

**Prerequisites:**

```bash
# In .env.development.local, ensure you have:
READWISE_ACCESS_TOKEN=your-production-readwise-token
SYNC_API_KEY=your-secret-sync-key
```

**Trigger sync via curl:**

```bash
# Using query parameter
curl "http://localhost:3000/api/sync/readwise?token=your-secret-sync-key"

# Or using header
curl -H "x-readwise-sync-secret: your-secret-sync-key" \
  "http://localhost:3000/api/sync/readwise"
```

**Continuous sync during development:**

Use the provided cron script to sync every 60 seconds:

```bash
# Set environment variables
export SYNC_URL="http://localhost:3000/api/sync/readwise?token=your-secret-sync-key"
export SYNC_INTERVAL_SECONDS=60

# Run in background or separate terminal
./scripts/run-readwise-sync-cron.sh
```

Press Ctrl+C to stop.

### Sync API Endpoint

**Endpoint:** `POST /api/sync/readwise`

**Authentication:** Requires `SYNC_API_KEY` via:

- Query parameter: `?token=your-sync-api-key`
- Header: `x-readwise-sync-secret: your-sync-api-key`

**Response:**

```json
{
  "success": true,
  "documentsProcessed": 42,
  "updatedCursor": "2026-01-22T12:00:00Z"
}
```

**Rate Limiting:**

The endpoint respects Readwise's 20 requests/minute limit by:

- Paginating requests
- Adding delays between API calls
- Tracking sync state to minimize API calls

---

## Troubleshooting

### Supabase Issues

**Problem: `npx supabase start` fails**

```bash
# Check if Docker is running
docker ps

# If Docker isn't running, start Docker Desktop

# Check for port conflicts
lsof -i :54321  # Should be empty
lsof -i :54322  # Should be empty
lsof -i :54323  # Should be empty

# If ports are in use, stop conflicting services or use:
npx supabase stop
npx supabase start
```

**Problem: Migrations not applied**

```bash
# Reset local database and re-apply all migrations
npx supabase db reset

# Or manually apply migrations
npx supabase migration up
```

**Problem: Can't connect to production Supabase**

Check your `.env.development.local`:

```bash
# Verify variables are set
cat .env.development.local | grep SUPABASE

# Common issues:
# - Wrong project URL (should be https://YOUR-PROJECT.supabase.co)
# - Anon key vs secret key swapped
# - Extra quotes or whitespace in values
```

### Test Issues

**Problem: E2E tests fail with "Supabase configuration error"**

This error means the app can't find required Supabase environment variables.

```bash
# 1. Verify .env.test exists
ls -la .env.test

# 2. If missing, create it from template
cp .env.test.example .env.test

# 3. Verify it has the required variables
grep "NEXT_PUBLIC_SUPABASE" .env.test
# Should show URL and PUBLISHABLE_KEY

# 4. Ensure Supabase is running
npx supabase start
```

**Problem: E2E tests hang or fail to start**

```bash
# 1. Check if Supabase is running
npx supabase status

# 2. Check if port 3099 is available
lsof -i :3099

# 3. Verify .env.test exists and has correct values
cat .env.test | grep SUPABASE_URL
# Should show: http://127.0.0.1:54321

# 4. Run a single test to isolate the issue
npm run test:e2e tests/e2e/auth.spec.ts
```

**Problem: Integration tests fail with "Invalid token"**

```bash
# Verify your test Readwise token is valid
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://readwise.io/api/v3/list/

# If that fails, regenerate your token at:
# https://readwise.io/access_token
```

**Problem: Tests fail with environment contamination errors**

```bash
# Ensure you're using .env.development.local (NOT .env.local)
# .env.local loads in ALL environments including test

# Rename if needed
mv .env.local .env.development.local

# Verify NODE_ENV is set correctly
grep NODE_ENV playwright.config.ts
# Should see: NODE_ENV: 'test'
```

### Sync Issues

**Problem: Sync returns 401 Unauthorized**

Check that `SYNC_API_KEY` matches in:

- Your environment file (`.env.development.local`)
- Your sync request (query param or header)

**Problem: Sync returns 500 Internal Server Error**

```bash
# Check server logs for details
npm run dev

# Then trigger sync and watch the console

# Common causes:
# - Invalid READWISE_ACCESS_TOKEN
# - Readwise API rate limit exceeded (wait 60 seconds)
# - Supabase secret key missing (SUPABASE_SECRET_KEY)
```

**Problem: Sync completes but no documents appear**

```bash
# Check the database directly
npx supabase db reset  # Reset and re-sync

# Or query via Supabase Studio:
open http://127.0.0.1:54323
# Navigate to Table Editor → cached_documents
```

### Build Issues

**Problem: `npm run build` fails**

```bash
# Common fixes:

# 1. Clear Next.js cache
rm -rf .next

# 2. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Check TypeScript errors
npm run type-check

# 4. Check for environment variable issues
# Ensure all NEXT_PUBLIC_* variables are set at build time
```

### Common Errors

**Error: "Signing method HS256 is invalid"**

This is a known issue with Supabase local development and admin API operations. It's non-critical - test cleanup will gracefully fail but tests will still pass. See [docs/devops/e2e-test-environment-fixes.md](docs/devops/e2e-test-environment-fixes.md) for details.

**Error: "Rate limit exceeded"**

You've hit Readwise's 20 requests/minute limit. Wait 60 seconds before retrying.

**Error: "Port 3000 already in use"**

```bash
# Find the process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or run on a different port
npm run dev -- --port 3001
```

---

## Documentation

### Key Documents

- **[Project Plan](./docs/PROJECT_PLAN.md)** - Full project specification and task breakdown
- **[AGENTS.md](./AGENTS.md)** - Working guidelines for AI agents
- **[Documentation Index](./docs/INDEX.md)** - Catalog of all project documentation
- **[Open Questions](./OPEN_QUESTIONS.md)** - Tracked decisions and uncertainties

### DevOps & Security

- **[Environment Separation](./docs/devops/environment-separation.md)** - How test/prod environments are isolated
- **[E2E Test Fixes](./docs/devops/e2e-test-environment-fixes.md)** - Test infrastructure improvements
- **[E2E Auth Test Fixes](./docs/2026-01-28-e2e-auth-test-fixes.md)** - Authentication test fixes and Supabase config validation
- **[Security Checklist](./docs/devops/SECURITY-CHECKLIST.md)** - Security requirements and status
- **[Deployment Review](./docs/devops/DEPLOYMENT-REVIEW-SUMMARY.md)** - Deployment infrastructure analysis

### Feature Documentation

- **[Readwise Sync](./docs/MANUAL_READWISE_SYNC_PLAN.md)** - Sync implementation details
- **[Sync Troubleshooting](./docs/SYNC_TROUBLESHOOTING.md)** - Debugging sync issues
- **[Design Revamp Plan](./docs/redesign/DESIGN_REVAMP_PLAN.md)** - UI/UX redesign strategy

### Development Workflow

For detailed development guidelines, workflow conventions, and testing standards, see [AGENTS.md](./AGENTS.md).

### Contributing

1. Read [AGENTS.md](./AGENTS.md) for workflow guidelines
2. Check [docs/INDEX.md](./docs/INDEX.md) for existing documentation
3. Run tests before committing: `npm test && npm run test:e2e`
4. Keep commits small and focused
5. Update documentation when adding features

---

## License

[Add your license here]

---

## Support

For issues, questions, or feature requests:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review [docs/SYNC_TROUBLESHOOTING.md](./docs/SYNC_TROUBLESHOOTING.md) for sync-specific issues
3. Check [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) for known issues
4. Open a GitHub issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs or error messages
