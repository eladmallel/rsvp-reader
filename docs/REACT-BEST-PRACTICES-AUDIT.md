# React & Next.js Best Practices Audit

**Generated:** 2026-01-23
**Last Updated:** 2026-01-23
**Based on:** Vercel React Best Practices Guidelines
**Codebase:** RSVP Reader (Next.js 16 + React 19)

---

## Progress Tracking

| Item | Description                                      | Status     | Date       |
| ---- | ------------------------------------------------ | ---------- | ---------- |
| 1.1  | Parallelize auth checks                          | ✅ Done    | 2026-01-23 |
| 1.2  | Add AbortController (library sync polling)       | ✅ Done    | 2026-01-23 |
| 1.2  | Add AbortController (RSVP article fetch)         | ✅ Done    | 2026-01-23 |
| 5.1  | Memoize time calculations in RSVPPlayer          | ✅ Done    | 2026-01-23 |
| 5.2  | Memoize source/text extraction in RsvpPageClient | ✅ Done    | 2026-01-23 |
| 1.2  | Add AbortController (feed page)                  | 🔲 Pending | -          |
| 2.1  | Direct imports over barrel files                 | 🔲 Pending | -          |
| 2.2  | Dynamic imports for heavy components             | 🔲 Pending | -          |
| 3.1  | Add React.cache() for server deduplication       | 🔲 Pending | -          |
| 4.1  | Consider SWR for data fetching                   | 🔲 Pending | -          |
| 5.3  | Memoize handlers in ArticleListItem              | 🔲 Pending | -          |
| 6.1  | Extract inline SVGs                              | 🔲 Pending | -          |
| 7.1  | Memoize date formatting in ArticleListItem       | 🔲 Pending | -          |

---

## Executive Summary

This audit identifies opportunities to improve code maintainability, reduce bugs, improve performance, and align with battle-tested React/Next.js patterns. Issues are sorted by priority based on their impact.

**Overall Assessment:** The codebase is well-structured with good patterns in place (proper cleanup, debouncing, hydration safety). Main opportunities lie in parallelizing async operations, adding request cancellation, and considering data fetching libraries.

---

## Priority 1: CRITICAL - Eliminating Waterfalls

### 1.1 Sequential Auth Checks Should Be Parallel ✅ DONE

**Files:** `src/app/(main)/page.tsx`

**Status:** ✅ Implemented 2026-01-23

**What was done:** Changed sequential `checkAuth()` → `checkConnection()` to run in parallel with `Promise.all()`.

**Impact:** Reduces initial page load time by running checks concurrently.

---

### 1.2 Missing AbortController for Fetch Cleanup (Partially Done)

**Files:**

- `src/app/(main)/library/page.tsx` - ✅ DONE (sync polling)
- `src/app/(main)/feed/page.tsx` - 🔲 PENDING (similar pattern exists)
- `src/app/rsvp/RsvpPageClient.tsx` - ✅ DONE (article fetch)

**Status:** Partially implemented 2026-01-23

**What was done:**

- Library page sync polling now uses `AbortController` with proper `AbortError` handling
- RSVP page article fetch now uses `AbortController` with cleanup on unmount

**Remaining:** Feed page has similar patterns that could benefit from AbortController.

**Impact:** Properly cancels in-flight requests, saving bandwidth and preventing potential memory leaks.

---

## Priority 2: CRITICAL - Bundle Size Optimization

### 2.1 Barrel File Imports May Affect Tree-Shaking

**Files:**

- `src/components/ui/index.ts`
- `src/components/library/index.ts`
- `src/components/rsvp/index.ts`
- `src/contexts/index.ts`
- `src/hooks/index.ts`

**Usage Examples:**

- `src/app/(main)/library/page.tsx` line 6-11: `import { ArticleListItem, SubTabs, ... } from '@/components/library'`
- `src/app/rsvp/RsvpPageClient.tsx` line 5-6: `import { RSVPPlayer } from '@/components/rsvp'`

**Issue:** Barrel files can prevent effective tree-shaking, potentially including unused code in bundles.

**Current Code:**

```typescript
// src/components/library/index.ts
export { ArticleCard } from './ArticleCard';
export { ArticleListItem } from './ArticleListItem';
export { ContinueReadingBanner } from './ContinueReadingBanner';
// ... all exports bundled together

// Usage
import { ArticleListItem, SubTabs } from '@/components/library';
```

**Recommended Fix:**

```typescript
// Direct imports for better tree-shaking
import { ArticleListItem } from '@/components/library/ArticleListItem';
import { SubTabs, librarySubTabs } from '@/components/library/SubTabs';
```

**Impact:** Smaller bundle sizes through better dead-code elimination. However, verify with bundle analyzer first - React Compiler may already optimize this.

---

### 2.2 No Dynamic Imports for Heavy Components

**Files:** Various route files

**Issue:** No `next/dynamic` or `React.lazy` usage found. Large components load eagerly even when not immediately needed.

**Candidates for dynamic import:**

- Settings modals (`src/components/settings/*`)
- Chat interface (`src/app/chat/page.tsx`)
- Player settings panel (`src/components/rsvp/PlayerSettingsPanel.tsx`)

**Recommended Fix:**

```typescript
// Before
import { PlayerSettingsPanel } from './PlayerSettingsPanel';

// After - load only when needed
import dynamic from 'next/dynamic';

const PlayerSettingsPanel = dynamic(
  () => import('./PlayerSettingsPanel').then(mod => ({ default: mod.PlayerSettingsPanel })),
  { loading: () => <div>Loading settings...</div> }
);
```

**Impact:** Reduces initial JavaScript bundle, improving Time to Interactive.

---

## Priority 3: HIGH - Server-Side Performance

### 3.1 Missing React.cache() for Request Deduplication

**Files:** API routes in `src/app/api/`

**Issue:** No `React.cache()` usage found. Duplicate database calls within the same request aren't deduplicated.

**Current Pattern:** Direct Supabase calls without caching wrapper.

**Recommended Fix:**

```typescript
// src/lib/supabase/cached.ts
import { cache } from 'react';
import { createClient } from './server';

export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});

export const getCachedDocument = cache(async (id: string) => {
  const supabase = await createClient();
  return supabase.from('cached_documents').select('*').eq('id', id).single();
});
```

**Impact:** Eliminates duplicate database queries within the same request cycle.

---

## Priority 4: MEDIUM-HIGH - Client-Side Data Fetching

### 4.1 Consider SWR for Data Fetching

**Files:** All pages with `useEffect` + `fetch` pattern

**Issue:** Current pattern requires manual handling of:

- Loading states
- Error states
- Caching
- Revalidation
- Request deduplication

**Current Code:**

```typescript
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [articles, setArticles] = useState<ArticleListItemData[]>([]);

useEffect(() => {
  async function loadDocuments() {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await fetchDocuments(location);
      setArticles(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }
  loadDocuments();
}, [fetchDocuments, isConnected, activeSubTab]);
```

**Recommended Fix:**

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function LibraryPage() {
  const { data, error, isLoading, mutate } = useSWR(
    isConnected ? `/api/reader/documents?location=${location}&pageSize=50` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const articles = data?.documents?.map(documentToArticleListItem) ?? [];
  // Built-in loading, error, and caching handled by SWR
}
```

**Impact:** Automatic request deduplication, caching, and cleaner code. Also enables stale-while-revalidate pattern.

---

## Priority 5: MEDIUM - Re-render Optimization

### 5.1 Time Calculations Should Be Memoized ✅ DONE

**File:** `src/components/rsvp/RSVPPlayer.tsx`

**Status:** ✅ Implemented 2026-01-23

**What was done:** Time calculations (`elapsedSeconds`, `remainingSeconds`) wrapped in `useMemo` with dependencies on `player.totalWords`, `player.wpm`, `player.currentIndex`.

**Impact:** Reduces unnecessary recalculations during high-frequency updates (RSVP playback).

---

### 5.2 Source Extraction Should Be Memoized ✅ DONE

**File:** `src/app/rsvp/RsvpPageClient.tsx`

**Status:** ✅ Implemented 2026-01-23

**What was done:**

- `extractSource()` wrapped in `useMemo` with `[article]` dependency
- `getTextContent()` replaced with memoized `text` value using `useMemo`

**Impact:** Avoids re-parsing HTML content on every render.

---

### 5.3 Handler Functions Recreated Unnecessarily

**File:** `src/components/library/ArticleListItem.tsx` (lines 38-52)

**Issue:** `handleClick`, `handleKeyDown`, and `handleMenuClick` are recreated on every render.

**Current Code:**

```typescript
const handleClick = () => {
  onClick?.(article);
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick?.(article);
  }
};
```

**Recommended Fix:**

```typescript
const handleClick = useCallback(() => {
  onClick?.(article);
}, [onClick, article]);

const handleKeyDown = useCallback(
  (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(article);
    }
  },
  [onClick, article]
);
```

**Note:** React Compiler may auto-optimize this. Verify with profiler before changing.

**Impact:** Stable function references when passed to child components.

---

## Priority 6: MEDIUM - Rendering Performance

### 6.1 Inline SVGs Could Be Extracted

**Files:**

- `src/app/(main)/library/page.tsx` (multiple inline SVGs)
- `src/components/library/ArticleListItem.tsx` (line 103-107)

**Issue:** Inline SVG definitions recreate JSX objects on every render.

**Current Code:**

```typescript
<button className={styles.iconButton} type="button" aria-label="Menu">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
</button>
```

**Recommended Fix:**

```typescript
// Extract to module level or separate component
const MenuIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// In component
<button className={styles.iconButton} type="button" aria-label="Menu">
  {MenuIcon}
</button>
```

**Impact:** Avoids recreating SVG element references on re-renders.

---

## Priority 7: LOW - JavaScript Performance

### 7.1 Date Calculations in List Items

**File:** `src/components/library/ArticleListItem.tsx` (lines 58-78)

**Issue:** Date calculations and comparisons happen for each item in a list on every render.

**Current Code:**

```typescript
const createdDate = new Date(article.createdAt);
const now = new Date();
const isToday = createdDate.toDateString() === now.toDateString();
const isYesterday =
  new Date(now.getTime() - 86400000).toDateString() === createdDate.toDateString();
// ... formatting logic
```

**Recommended Fix:**

```typescript
const timeDisplay = useMemo(() => {
  const createdDate = new Date(article.createdAt);
  const now = new Date();
  const isToday = createdDate.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86400000).toDateString() === createdDate.toDateString();

  if (isToday) {
    return createdDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  if (isYesterday) return 'Yesterday';
  return createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}, [article.createdAt]);
```

**Impact:** Reduces redundant Date object creation in list rendering.

---

## What's Already Done Well

The codebase already follows several best practices:

1. **Proper event listener cleanup** - All `addEventListener` calls have corresponding cleanup in `useEffect` return
2. **Hydration safety** - `mounted` state pattern prevents SSR/client mismatches
3. **Debounced saves** - Reading position saves are debounced (500ms)
4. **React Compiler enabled** - Automatic optimizations for many patterns
5. **Security headers** - CSP, X-Frame-Options, XSS-Protection configured
6. **Parallel fetches in settings** - `Promise.all()` already used for profile/preferences
7. **Safe conditional rendering** - Uses ternaries instead of problematic `&&` patterns

---

## Implementation Priority

| Priority | Issue                         | Effort | Impact | Status     |
| -------- | ----------------------------- | ------ | ------ | ---------- |
| 1        | Parallelize auth checks       | Low    | High   | ✅ Done    |
| 2        | Add AbortController           | Medium | High   | 🔶 Partial |
| 3        | Direct imports (verify first) | Low    | Medium | 🔲 Pending |
| 4        | Dynamic imports for modals    | Low    | Medium | 🔲 Pending |
| 5        | Add React.cache()             | Medium | Medium | 🔲 Pending |
| 6        | Consider SWR                  | High   | High   | 🔲 Pending |
| 7        | Memoize time calculations     | Low    | Low    | ✅ Done    |
| 8        | Memoize source extraction     | Low    | Low    | ✅ Done    |
| 9        | Extract inline SVGs           | Low    | Low    | 🔲 Pending |
| 10       | Memoize date formatting       | Low    | Low    | 🔲 Pending |

---

## Next Steps (For Next Session)

### Immediate (Quick Wins)

1. **Add AbortController to feed page** - Same pattern as library page, apply to `src/app/(main)/feed/page.tsx`
2. **Run bundle analysis** - Execute `next build --analyze` to verify if barrel imports are actually affecting bundle size
3. **Dynamic imports for modals** - Add `next/dynamic` for `PlayerSettingsPanel` and settings components

### Medium Term

4. **Direct imports** - If bundle analysis shows issues, switch from barrel imports to direct imports
5. **Extract inline SVGs** - Move repeated SVG icons to module-level constants
6. **Memoize handlers in ArticleListItem** - Add `useCallback` to handler functions (verify with React Profiler first)

### Consider Later

7. **Add React.cache()** - Create `src/lib/supabase/cached.ts` for server-side request deduplication
8. **Evaluate SWR** - Consider starting with Library page to test benefits of SWR

### How to Continue

1. Read this file for context
2. Start with "Immediate" items above
3. Update the Progress Tracking table as items are completed
4. Run `npm run test && npm run lint && npm run type-check` before committing
