# CI Speedup Plan

**Created:** 2026-02-02  
**Goal:** Reduce CI time from ~10 minutes to ~4-5 minutes  
**Target Improvement:** 50%+ faster

---

## Progress Tracking

| #   | Task                                | Status          | Time Saved | Notes                                                       |
| --- | ----------------------------------- | --------------- | ---------- | ----------------------------------------------------------- |
| 1   | Cache Playwright browsers           | [x] Done        | ~1-2 min   | Quick win                                                   |
| 2   | Split into parallel jobs            | [x] Done        | ~1 min     | Lint/typecheck/unit in parallel                             |
| 3   | Shard E2E tests by viewport         | [x] Done        | ~1.5-2 min | Mobile + Desktop parallel                                   |
| 4   | Move Supabase start to E2E job only | [x] Done        | ~30s       | Unit tests don't need it                                    |
| 5   | Verify and test changes             | [x] Done        | -          | Local tests pass (unit: 10s, E2E: ~2.5-2.8min per viewport) |
| 6   | Update AGENTS.md if needed          | [ ] Not Started | -          | Document new CI structure                                   |

**Total Expected Savings:** ~4-5 minutes (50% reduction)

---

## Current State Analysis

### CI Duration Breakdown (Current ~10 min)

| Step                            | Time         | Bottleneck? |
| ------------------------------- | ------------ | ----------- |
| Checkout + Setup Node           | ~30s         | No (cached) |
| npm ci                          | ~15-30s      | No          |
| Lint                            | ~10-20s      | No          |
| Type check                      | ~10-20s      | No          |
| Copy .env.test.example          | <1s          | No          |
| **Supabase start**              | **~2-3 min** | ⚠️ YES      |
| Unit tests                      | ~11s         | No          |
| **Install Playwright browsers** | **~1-2 min** | ⚠️ YES      |
| **E2E tests (364 cases)**       | **~3-5 min** | ⚠️ YES      |
| Upload artifacts                | ~30s         | No          |

### Key Problems

1. **No Playwright caching** - Downloads ~200MB Chromium every run
2. **Serial execution** - All steps run one after another
3. **E2E runs both viewports sequentially** - 182 tests × 2 viewports = 364 tests
4. **Supabase starts for all tests** - Unit tests mock it anyway

---

## Implementation Plan

### Task 1: Cache Playwright Browsers

**File:** `.github/workflows/main.yml`

**What to do:**
Add caching for Playwright browser binaries before the install step.

**Implementation:**

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

- name: Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps chromium

- name: Install Playwright system deps (if cached)
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: npx playwright install-deps chromium
```

**Why:** Browser binaries don't change unless package-lock.json changes. Caching saves ~1-2 min per run.

---

### Task 2: Split into Parallel Jobs

**File:** `.github/workflows/main.yml`

**What to do:**
Restructure the workflow into 3 parallel jobs:

1. `lint-typecheck` - Fast static analysis
2. `unit-tests` - Vitest unit tests
3. `e2e-tests` - Playwright E2E tests

**New structure:**

```yaml
jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: cp .env.test.example .env.test
      - run: npm run test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      # ... (see Task 3 for full implementation)

  deploy:
    needs: [lint-typecheck, unit-tests, e2e-tests]
    # ... existing deploy config
```

**Why:** These jobs have no dependencies on each other. Running in parallel means the total time = slowest job, not sum of all jobs.

---

### Task 3: Shard E2E Tests by Viewport

**File:** `.github/workflows/main.yml`

**What to do:**
Use a matrix strategy to run Mobile Chrome and Desktop Chrome in parallel.

**Implementation:**

```yaml
e2e-tests:
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false
    matrix:
      project: ['Mobile Chrome', 'Desktop Chrome']
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: cp .env.test.example .env.test
    - run: npx supabase start

    # Playwright caching (from Task 1)
    - name: Cache Playwright browsers
      uses: actions/cache@v4
      id: playwright-cache
      with:
        path: ~/.cache/ms-playwright
        key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

    - name: Install Playwright browsers
      if: steps.playwright-cache.outputs.cache-hit != 'true'
      run: npx playwright install --with-deps chromium

    - name: Install Playwright system deps (if cached)
      if: steps.playwright-cache.outputs.cache-hit == 'true'
      run: npx playwright install-deps chromium

    - name: Run E2E tests
      run: npm run test:e2e -- --project="${{ matrix.project }}"

    - name: Upload Playwright report
      uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: playwright-report-${{ matrix.project }}
        path: playwright-report/
        retention-days: 30

    - name: Upload Playwright screenshots
      uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: playwright-screenshots-${{ matrix.project }}
        path: test-results/screenshots/
        retention-days: 30
```

**Why:**

- Currently: 182 tests × 2 viewports = 364 tests run sequentially
- After: 182 tests per viewport, running in 2 parallel jobs
- Cuts E2E time roughly in half

---

### Task 4: Move Supabase Start to E2E Job Only

**File:** `.github/workflows/main.yml`

**What to do:**
Remove `npx supabase start` from the main test job. Only the E2E job needs it.

**Verification needed:**

1. Check if unit tests actually require Supabase running
2. Unit tests should mock Supabase client - verify this is true

**Current unit test behavior:**

- Tests use mocked Supabase client (confirmed in test files)
- `.env.test` provides connection strings but tests don't connect
- Only integration tests (`api.integration.test.ts`) need real Supabase, and these are skipped in CI

**Implementation:**

- `lint-typecheck` job: No Supabase
- `unit-tests` job: No Supabase (mocked)
- `e2e-tests` job: Supabase start included

---

### Task 5: Verify and Test Changes

**What to do:**

1. Push changes to a branch
2. Open a PR to trigger CI
3. Measure new CI times
4. Compare against baseline (~10 min)
5. Fix any issues that arise

**Success criteria:**

- All jobs pass
- Total wall-clock time ≤ 5 minutes
- No flaky tests introduced
- Artifacts upload correctly with new naming

---

### Task 6: Update Documentation

**Files to update:**

- `AGENTS.md` - Update CI section if workflow structure changes significantly
- This file - Mark tasks complete, document actual savings

---

## Final Workflow Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│   │ lint-        │  │ unit-tests   │  │ e2e-tests (matrix)   │ │
│   │ typecheck    │  │              │  │                      │ │
│   │              │  │              │  │  ┌────────────────┐  │ │
│   │ • checkout   │  │ • checkout   │  │  │ Mobile Chrome  │  │ │
│   │ • npm ci     │  │ • npm ci     │  │  │ • supabase     │  │ │
│   │ • lint       │  │ • env setup  │  │  │ • playwright   │  │ │
│   │ • type-check │  │ • vitest     │  │  │ • run tests    │  │ │
│   │              │  │              │  │  └────────────────┘  │ │
│   │ ~1-2 min     │  │ ~1-2 min     │  │  ┌────────────────┐  │ │
│   └──────────────┘  └──────────────┘  │  │ Desktop Chrome │  │ │
│          │                 │          │  │ • supabase     │  │ │
│          │                 │          │  │ • playwright   │  │ │
│          │                 │          │  │ • run tests    │  │ │
│          │                 │          │  └────────────────┘  │ │
│          │                 │          │                      │ │
│          │                 │          │  ~3-4 min (parallel) │ │
│          │                 │          └──────────────────────┘ │
│          │                 │                    │              │
│          └─────────────────┴────────────────────┘              │
│                            │                                   │
│                            ▼                                   │
│                    ┌──────────────┐                            │
│                    │   deploy     │                            │
│                    │ (if main)    │                            │
│                    └──────────────┘                            │
│                                                                 │
│   Total wall-clock time: ~4-5 min (down from ~10 min)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Rollback Plan

If the new CI structure causes issues:

1. Revert to single-job workflow (current `main.yml`)
2. Keep Playwright caching (low risk, high value)
3. Investigate specific failures before re-attempting parallelization

---

## Future Optimizations (Out of Scope)

These could provide additional savings but are more complex:

1. **Use a persistent test Supabase** - Avoid `supabase start` entirely (~2-3 min savings)
2. **Run only affected E2E tests on PRs** - Based on changed files
3. **Optimize visual-alignment.spec.ts** - 959 lines, lots of duplicate setup
4. **Schedule-only visual tests** - Run heavy screenshot tests nightly, not on every PR
5. **Use larger GitHub runners** - More CPU cores for parallelism

---

## References

- Current workflow: `.github/workflows/main.yml`
- Playwright config: `playwright.config.ts`
- E2E tests: `tests/e2e/`
- Unit tests: `src/**/*.test.{ts,tsx}`
