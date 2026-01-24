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
| 1.2  | Add AbortController (feed page)                  | ✅ Done    | 2026-01-23 |
| 5.1  | Memoize time calculations in RSVPPlayer          | ✅ Done    | 2026-01-23 |
| 5.2  | Memoize source/text extraction in RsvpPageClient | ✅ Done    | 2026-01-23 |
| 2.0  | Bundle analyzer setup                            | ✅ Done    | 2026-01-23 |
| 2.2  | Dynamic imports for heavy components             | ✅ Done    | 2026-01-23 |
| 6.1  | Extract inline SVGs                              | ✅ Done    | 2026-01-23 |
| 2.1  | Direct imports over barrel files                 | 🔲 Pending | -          |
| 3.1  | Add React.cache() for server deduplication       | 🔲 Pending | -          |
| 4.1  | Consider SWR for data fetching                   | 🔲 Pending | -          |
| 5.3  | Memoize handlers in ArticleListItem              | ✅ Done    | 2026-01-23 |
| 7.1  | Memoize date formatting in ArticleListItem       | ✅ Done    | 2026-01-23 |

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

### 1.2 Missing AbortController for Fetch Cleanup ✅ DONE

**Files:**

- `src/app/(main)/library/page.tsx` - ✅ DONE (sync polling)
- `src/app/(main)/feed/page.tsx` - ✅ DONE (document fetch)
- `src/app/rsvp/RsvpPageClient.tsx` - ✅ DONE (article fetch)

**Status:** ✅ Fully implemented 2026-01-23

**What was done:**

- Library page sync polling uses `AbortController` with proper `AbortError` handling
- RSVP page article fetch uses `AbortController` with cleanup on unmount
- Feed page document fetch now uses `AbortController` with cleanup when tab changes or component unmounts

**Implementation details (Feed page):**

- Added optional `signal` parameter to `fetchDocuments` function
- Created `AbortController` inside the `loadDocuments` effect
- Passed signal to fetch call
- Added cleanup function to abort in-flight requests
- Properly handles `AbortError` by checking `err.name === 'AbortError'`

**Impact:** Properly cancels in-flight requests, saving bandwidth and preventing potential memory leaks and race conditions when users rapidly switch tabs.

---

## Priority 2: CRITICAL - Bundle Size Optimization

### 2.0 Bundle Analyzer Setup ✅ DONE

**Status:** ✅ Configured 2026-01-23

**What was done:**

- Installed `@next/bundle-analyzer` package
- Configured bundle analyzer in `next.config.ts` with `ANALYZE` environment variable
- Added `npm run build:analyze` script that builds with webpack and opens client bundle report
- Generated reports saved to `.next/analyze/` directory:
  - `client.html` - Client-side bundle (most important for users)
  - `nodejs.html` - Node.js server bundle
  - `edge.html` - Edge runtime bundle

**How to use:**

```bash
npm run build:analyze
```

This will build the app with webpack (instead of Turbopack) and automatically open the client bundle visualization in your browser.

**Next steps:** Review the generated reports to identify:

- Largest dependencies
- Impact of barrel imports on tree-shaking
- Opportunities for code splitting
- Duplicate dependencies

---

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

### 2.2 No Dynamic Imports for Heavy Components ✅ DONE

**Files:**

- `src/components/rsvp/RSVPPlayer.tsx` - ✅ DONE (PlayerSettingsPanel)
- `src/app/(main)/settings/page.tsx` - ✅ DONE (all modals)

**Status:** ✅ Implemented 2026-01-23

**What was done:**

Applied `next/dynamic` to conditionally-rendered components that are only needed when user takes specific actions:

1. **PlayerSettingsPanel** in RSVPPlayer:
   - Only loaded when user clicks settings button
   - `ssr: false` since settings are client-only interaction

2. **Settings Page Modals** (all three):
   - `WpmSettingModal` - Only loaded when user opens WPM settings
   - `SkipAmountModal` - Only loaded when user opens skip settings
   - `FontSelectorModal` - Only loaded when user opens font selector
   - All with `ssr: false` since modals are client-side interactions

**Implementation pattern:**

```typescript
const PlayerSettingsPanel = dynamic(
  () => import('./PlayerSettingsPanel').then((mod) => ({ default: mod.PlayerSettingsPanel })),
  { ssr: false }
);
```

**Impact:**

- Reduces initial JavaScript bundle by ~50-100KB (estimated)
- Improves Time to Interactive
- Modal code only downloaded when user opens the modal
- No loading spinners needed since modals animate in anyway

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

### 5.3 Handler Functions Recreated Unnecessarily ✅ DONE

**File:** `src/components/library/ArticleListItem.tsx`

**Status:** ✅ Implemented 2026-01-23

**What was done:** Wrapped all three handler functions (`handleClick`, `handleKeyDown`, `handleMenuClick`) in `useCallback` with appropriate dependencies.

**Implementation:**

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

const handleMenuClick = useCallback(
  (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuClick?.(article, e);
  },
  [onMenuClick, article]
);
```

**Impact:** Ensures stable function references, preventing unnecessary re-renders in child components that depend on these handlers.

---

## Priority 6: MEDIUM - Rendering Performance

### 6.1 Inline SVGs Could Be Extracted ✅ DONE

**Files:**

- `src/components/ui/icons.tsx` - ✅ CREATED (centralized icon exports)
- `src/app/(main)/library/page.tsx` - ✅ UPDATED (uses extracted icons)
- `src/app/(main)/feed/page.tsx` - ✅ UPDATED (uses extracted icons)
- `src/components/library/ArticleListItem.tsx` - ✅ UPDATED (uses extracted icon)

**Status:** ✅ Implemented 2026-01-23

**What was done:**

Created a centralized icons module (`src/components/ui/icons.tsx`) exporting common SVG icons as module-level constants:

- `MenuIcon` - Hamburger menu (3 horizontal lines)
- `MoreOptionsIcon` - Vertical 3-dot menu
- `MoreOptionsHorizontalIcon` - Horizontal 3-dot menu
- `AddIcon` - Plus icon in circle
- `BookIcon` - Book icon for library empty state
- `RSSIcon` - RSS feed icon for feed empty state

All pages and components now import and use these extracted icons instead of inline SVG definitions.

**Implementation:**

```typescript
// src/components/ui/icons.tsx
export const MenuIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// Usage in components
import { MenuIcon } from '@/components/ui/icons';

<button className={styles.iconButton} type="button" aria-label="Menu">
  {MenuIcon}
</button>
```

**Impact:**

- Avoids recreating SVG JSX objects on every render
- Reduces memory allocations
- Centralizes icon definitions for consistency
- Makes it easier to update icons globally

---

## Priority 7: LOW - JavaScript Performance

### 7.1 Date Calculations in List Items ✅ DONE

**File:** `src/components/library/ArticleListItem.tsx`

**Status:** ✅ Implemented 2026-01-23

**What was done:** Wrapped date formatting logic in `useMemo` with `[article.createdAt]` dependency to avoid recreating Date objects on every render.

**Previous Issue:** Date calculations and comparisons happened for each item in a list on every render.

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
| 2        | Add AbortController           | Medium | High   | ✅ Done    |
| 3        | Bundle analyzer setup         | Low    | Medium | ✅ Done    |
| 4        | Dynamic imports for modals    | Low    | Medium | ✅ Done    |
| 5        | Direct imports (verify first) | Low    | Medium | 🔲 Pending |
| 6        | Add React.cache()             | Medium | Medium | 🔲 Pending |
| 7        | Consider SWR                  | High   | High   | 🔲 Pending |
| 8        | Memoize time calculations     | Low    | Low    | ✅ Done    |
| 9        | Memoize source extraction     | Low    | Low    | ✅ Done    |
| 10       | Extract inline SVGs           | Low    | Low    | ✅ Done    |
| 11       | Memoize date formatting       | Low    | Low    | ✅ Done    |

---

## Next Steps (For Next Session)

### Immediate (Quick Wins)

1. ✅ **Add AbortController to feed page** - Same pattern as library page, apply to `src/app/(main)/feed/page.tsx`
2. ✅ **Bundle analyzer setup** - Configure and run bundle analysis
3. ✅ **Dynamic imports for modals** - Add `next/dynamic` for `PlayerSettingsPanel` and settings components
4. **Review bundle analysis reports** - Open `.next/analyze/client.html` to check barrel import impact (manual task)

### Medium Term

4. ✅ **Extract inline SVGs** - Move repeated SVG icons to module-level constants
5. **Direct imports** - If bundle analysis shows issues, switch from barrel imports to direct imports
6. **Memoize handlers in ArticleListItem** - Add `useCallback` to handler functions (verify with React Profiler first)

### Consider Later

7. **Add React.cache()** - Create `src/lib/supabase/cached.ts` for server-side request deduplication
8. **Evaluate SWR** - Consider starting with Library page to test benefits of SWR

### How to Continue

1. Read this file for context
2. Start with "Immediate" items above
3. Update the Progress Tracking table as items are completed
4. Run `npm run test && npm run lint && npm run type-check` before committing
