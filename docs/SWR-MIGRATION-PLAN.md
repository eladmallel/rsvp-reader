# Implementation Plan: Migrate to SWR for Data Fetching

## Objective

Replace manual `useEffect` + `fetch` patterns with SWR library to gain:

- Automatic request deduplication
- Built-in caching (instant page revisits)
- Cleaner, more maintainable code
- Less boilerplate (no manual loading/error state)
- Stale-while-revalidate pattern

## Background Context

Current state:

- All pages use manual `useEffect` + `fetch` with manual loading/error/data state
- No caching - every navigation triggers a fresh API call
- Library page has sync polling (3-second intervals)
- Feed page has client-side filtering of fetched data
- Settings page has mutations (PUT/DELETE)

Exploration findings:

- **Library page**: 3 data sources (connection, documents, sync status), sync polling with 3s intervals
- **Feed page**: 2 data sources (connection, feed documents), client-side filtering
- **Settings page**: 2 data sources (profile, preferences), 3 mutations (WPM, skip amount, font)

## Phased Implementation Approach

### ⚠️ CRITICAL: Phase Gates

**Each phase is a gate. You MUST:**

1. Complete all implementation tasks for the phase
2. Complete all testing tasks for the phase
3. Run ALL test commands (`type-check`, `lint`, `test`, `test:e2e`)
4. Ensure ALL tests pass with zero failures
5. Commit the changes for that phase
6. **ONLY THEN** proceed to the next phase

**If any test fails, STOP and fix it before continuing.**

---

### Phase 1: Install SWR + Create Fetcher Utilities ✅ FOUNDATION

**Files to create/modify:**

- `package.json` - Add `swr` dependency
- `src/lib/fetcher.ts` - Create reusable fetcher functions
- `src/lib/__tests__/fetcher.test.ts` - Unit tests for fetcher

**Implementation Tasks:**

1. Install SWR: `npm install swr`
2. Create `src/lib/fetcher.ts`:
   ```typescript
   export async function fetcher<T>(url: string): Promise<T> {
     const res = await fetch(url);
     if (!res.ok) throw new Error(`API error: ${res.status}`);
     return res.json();
   }
   ```

**Testing Tasks:**

1. Create `src/lib/__tests__/fetcher.test.ts` with tests for:
   - Successful fetch returns parsed JSON
   - Failed fetch throws error with status code
   - Network error handling

**Phase 1 Verification (MUST PASS BEFORE PHASE 2):**

```bash
npm run type-check  # TypeScript must compile with no errors
npm run lint        # No linting errors
npm run test        # All unit tests pass (including new fetcher tests)
npm run test:e2e    # All E2E tests still pass (no regressions)
```

**DO NOT PROCEED TO PHASE 2 UNTIL ALL CHECKS PASS**

---

### Phase 2: Migrate Library Page (Most Complex) 🎯 MAIN MIGRATION

**File:** `src/app/(main)/library/page.tsx`

**Current pattern:**

- 3 separate `useState` + `useEffect` blocks
- Manual loading/error states for documents
- Polling sync status with `setInterval`
- AbortController for cleanup

**SWR approach:**

```typescript
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

// Connection check (unchanged - runs once)
const { data: connectionData } = useSWR('/api/auth/connect-reader', fetcher, {
  revalidateOnFocus: false,
});
const isConnected = connectionData?.isConnected ?? null;

// Documents fetch
const location = activeSubTab === 'all' ? 'all' : activeSubTab === 'inbox' ? 'new' : 'later';
const {
  data: docsData,
  error: docsError,
  isLoading,
} = useSWR(isConnected ? `/api/reader/documents?location=${location}&pageSize=50` : null, fetcher, {
  revalidateOnFocus: false,
});

// Sync status polling
const { data: syncData, mutate: mutateSyncStatus } = useSWR(
  isSyncing ? '/api/sync/readwise/status' : null,
  fetcher,
  {
    refreshInterval: 3000, // SWR built-in polling
    revalidateOnFocus: false,
  }
);
```

**Implementation Tasks:**

1. Remove `useState` for `isLoading`, `error`, `articles`, `syncError`
2. Replace document fetch `useEffect` with `useSWR`
3. Replace sync polling `useEffect` with `useSWR` (use `refreshInterval` option)
4. Replace connection check `useEffect` with `useSWR`
5. Derive `articles` from `docsData?.documents?.map(documentToArticleListItem) ?? []`
6. Update sync trigger to call `mutateSyncStatus()` after triggering sync

**Testing Tasks:**

1. Review existing E2E tests for library page (likely in `tests/e2e/library.spec.ts`)
2. Update tests if needed to account for SWR caching behavior
3. Add test for cache behavior: navigate away from library, then back - should load instantly
4. Verify sync polling test still works with SWR's `refreshInterval`

**Phase 2 Verification (MUST PASS BEFORE PHASE 3):**

```bash
npm run type-check  # TypeScript compiles with no errors
npm run lint        # No linting errors
npm run test        # All unit tests pass
npm run test:e2e    # All E2E tests pass, especially library tests
```

**Manual Verification:**

1. Open library page - documents load
2. Switch between All/Inbox/Later tabs - works correctly
3. Trigger sync - polling starts and updates status every 3 seconds
4. Navigate away and back to library - instant load (cache working)
5. Check DevTools console - no errors

**DO NOT PROCEED TO PHASE 3 UNTIL ALL CHECKS PASS**

**Benefits:**

- Eliminates ~50 lines of boilerplate
- Automatic polling cleanup when `isSyncing` becomes false
- Built-in error handling
- Cached documents when switching between tabs

---

### Phase 3: Migrate Feed Page (Similar to Library) 📄 SIMILAR PATTERN

**File:** `src/app/(main)/feed/page.tsx`

**Current pattern:**

- 2 `useState` + `useEffect` blocks
- Client-side filtering by `activeSubTab` (seen/unseen)
- AbortController cleanup

**SWR approach:**

```typescript
const { data: connectionData } = useSWR('/api/auth/connect-reader', fetcher);
const isConnected = connectionData?.isConnected ?? null;

const {
  data: docsData,
  error,
  isLoading,
} = useSWR(isConnected ? '/api/reader/documents?location=feed&pageSize=50' : null, fetcher, {
  revalidateOnFocus: false,
});

// Client-side filtering (unchanged)
const allArticles = docsData?.documents?.map(documentToArticleListItem) ?? [];
const articles = allArticles.filter(
  (article) => activeSubTab === 'all' || (activeSubTab === 'unseen' && !article.isRead)
);
```

**Implementation Tasks:**

1. Remove `useState` for `isLoading`, `error`, `articles`, `isConnected`
2. Replace both `useEffect` blocks with `useSWR` calls
3. Keep client-side filtering logic (ensure it still works with SWR data)
4. Remove AbortController (SWR handles cleanup automatically)

**Testing Tasks:**

1. Review existing E2E tests for feed page (likely in `tests/e2e/feed.spec.ts`)
2. Update tests if needed to account for SWR caching
3. Verify client-side filtering still works correctly (all/unseen tabs)
4. Add test for cache behavior on feed page

**Phase 3 Verification (MUST PASS BEFORE PHASE 4):**

```bash
npm run type-check  # TypeScript compiles with no errors
npm run lint        # No linting errors
npm run test        # All unit tests pass
npm run test:e2e    # All E2E tests pass, especially feed tests
```

**Manual Verification:**

1. Open feed page - documents load
2. Switch between all/unseen tabs - filtering works correctly
3. Navigate away and back - instant load (cache working)
4. Check DevTools console - no errors

**DO NOT PROCEED TO PHASE 4 UNTIL ALL CHECKS PASS**

---

### Phase 4: Migrate Settings Page (Mutations) ⚙️ MUTATION PATTERN

**File:** `src/app/(main)/settings/page.tsx`

**Current pattern:**

- Single `useEffect` with `Promise.all()` for initial data
- 3 mutation handlers: `handleSaveWpm`, `handleSaveSkipAmount`, `handleSaveFont`
- Optimistic local state updates
- No error handling for mutations

**SWR approach:**

```typescript
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

// Data fetching
const { data: profile } = useSWR('/api/user/profile', fetcher);
const { data: preferences, mutate: mutatePreferences } = useSWR('/api/user/preferences', fetcher);

// Mutation helper
async function updatePreferences(url: string, { arg }: { arg: Partial<UserPreferences> }) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error('Failed to update preferences');
  return res.json();
}

// Mutations
const { trigger: saveWpm } = useSWRMutation('/api/user/preferences', updatePreferences);

async function handleSaveWpm(wpm: number) {
  // Optimistic update
  mutatePreferences({ ...preferences, wpm }, false);
  await saveWpm({ wpm });
  mutatePreferences(); // Revalidate
}
```

**Implementation Tasks:**

1. Remove `useState` for `profile`, `preferences`, `isLoading`
2. Replace `useEffect` with two `useSWR` calls
3. Add `useSWRMutation` for preference updates
4. Keep optimistic update pattern but use SWR's `mutate`
5. Add error handling for mutations (display error messages in UI)

**Testing Tasks:**

1. Review existing E2E tests for settings page (likely in `tests/e2e/settings.spec.ts`)
2. Update tests if needed to account for SWR mutations
3. Verify optimistic updates still work correctly
4. Add test for error handling when mutation fails
5. Test all three mutation handlers: WPM, skip amount, font

**Phase 4 Verification (MUST PASS BEFORE FINAL COMMIT):**

```bash
npm run type-check  # TypeScript compiles with no errors
npm run lint        # No linting errors
npm run test        # All unit tests pass
npm run test:e2e    # All E2E tests pass, especially settings tests
```

**Manual Verification:**

1. Open settings page - profile and preferences load
2. Update WPM - saves successfully, UI updates
3. Update skip amount - saves successfully
4. Update font - saves successfully
5. Disconnect Readwise - profile updates correctly
6. Check DevTools console - no errors
7. Test error scenarios if possible (network offline)

**DO NOT PROCEED TO FINAL COMMIT UNTIL ALL CHECKS PASS**

---

## Testing Strategy

**Critical Rule: ALL tests must pass at the end of EACH phase before proceeding to the next phase.**

### Test Commands (Run After Each Phase)

```bash
npm run type-check  # TypeScript compilation
npm run lint        # ESLint checks
npm run test        # Unit tests (Vitest)
npm run test:e2e    # E2E tests (Playwright)
```

### Test Coverage Requirements

Each phase must:

1. **Update or add tests** for all modified code
2. **Verify no regressions** in existing functionality
3. **Pass all existing tests** before moving forward
4. **Add new tests** for new SWR-specific behavior (caching, mutations)

### When Tests Fail

If any test fails:

1. **STOP implementation** - do not proceed to next phase
2. **Debug the failure** - fix the code or update the test
3. **Re-run all tests** until they all pass
4. **Only then** move to the next phase

### E2E Test Files to Monitor

- `tests/e2e/library.spec.ts` - Library page tests
- `tests/e2e/feed.spec.ts` - Feed page tests
- `tests/e2e/settings.spec.ts` - Settings page tests
- `tests/e2e/navigation.spec.ts` - Cross-page navigation tests (if exists)

---

## Rollback Plan

If issues arise:

1. Each page migration is independent - can rollback individually
2. Git commit after each phase for easy revert
3. Keep manual patterns in git history for reference

---

## Critical Files

| File                               | Purpose       | Changes                          |
| ---------------------------------- | ------------- | -------------------------------- |
| `package.json`                     | Dependencies  | Add `swr`                        |
| `src/lib/fetcher.ts`               | Utilities     | Create fetcher helper            |
| `src/app/(main)/library/page.tsx`  | Library page  | Replace 3 useEffects with useSWR |
| `src/app/(main)/feed/page.tsx`     | Feed page     | Replace 2 useEffects with useSWR |
| `src/app/(main)/settings/page.tsx` | Settings page | Replace useEffect, add mutations |

---

## Commit Strategy

**Commit after each phase passes all tests:**

- **After Phase 1:** `feat: add SWR dependency and fetcher utility`
- **After Phase 2:** `feat: migrate library page to SWR`
- **After Phase 3:** `feat: migrate feed page to SWR`
- **After Phase 4:** `feat: migrate settings page to SWR`

Each commit should only happen AFTER all tests pass for that phase.

---

## Final Verification Checklist

After ALL phases are complete:

**Automated Checks:**

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (all unit tests)
- [ ] `npm run test:e2e` passes (all E2E tests)

**Functional Verification:**

- [ ] Library page loads correctly
- [ ] Tab switching in library is instant (caching works)
- [ ] Sync polling works and stops correctly
- [ ] Feed page loads and filters correctly
- [ ] Settings page loads profile and preferences
- [ ] All three settings mutations work (WPM, skip, font)
- [ ] No console errors anywhere
- [ ] Navigation between pages is fast

**Performance Check:**

- [ ] Run `npm run build:analyze` to verify bundle size
- [ ] SWR library adds ~13KB (acceptable)
- [ ] Overall bundle is not significantly larger

---

## Post-Audit Archiving Plan

After SWR implementation is complete:

1. **Update audit document** with final status:
   - Mark item 2.1 (barrel files) as "✅ Verified - No changes needed (bundle analysis shows healthy code splitting)"
   - Mark item 4.1 (SWR) as "✅ Done" with implementation date

2. **Archive the audit**:
   - Move `docs/REACT-BEST-PRACTICES-AUDIT.md` → `docs/archive/2026-01/REACT-BEST-PRACTICES-AUDIT.md`
   - Add final summary note at top of archived file

3. **Update docs/INDEX.md** to reflect archived location

---

## Estimated Impact

- **Code reduction:** ~100-150 lines removed (boilerplate state management)
- **Performance:** Instant page revisits via caching
- **Maintenance:** Simpler patterns, less manual cleanup needed
- **Bundle size:** +13KB (SWR library) but worth the benefits
