# CI Performance Baseline

**Baseline Date:** 2026-01-16 (Phase 0 complete)

**Total CI Time:** ~2m (varies based on Supabase startup)

## Step Breakdown

| Step                    | Duration |
| ----------------------- | -------- |
| Checkout                | 1s       |
| Setup Node.js           | 3s       |
| npm ci                  | 12s      |
| Lint                    | 3s       |
| Type check              | 2s       |
| Set up test environment | <1s      |
| Start Supabase local    | ~30s     |
| Unit tests              | 3s       |
| Install Playwright      | ~20s     |
| E2E tests               | ~30s     |
| Upload artifacts        | 2s       |

## Configuration

- **Runner:** `ubuntu-latest`
- **Node.js:** v20 with npm caching
- **Database:** Supabase local development (`npx supabase start`)
- **Playwright:** Installed via `npx playwright install --with-deps chromium`
- **E2E browsers:** Chromium only (for CI speed)

## Key CI Steps

```yaml
- name: Start Supabase local development
  run: npx supabase start

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
```

## Threshold

**Alert if CI exceeds:** 2m30s (25% increase from ~2m baseline)

## Targets

- Unit tests: < 30 seconds (full suite)
- E2E tests: < 2 minutes (full suite)
- Total CI: < 2m30s
