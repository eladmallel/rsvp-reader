# React & Next.js Best Practices Audit

**Generated:** 2026-01-23
**Based on:** Vercel React Best Practices Guidelines
**Codebase:** RSVP Reader (Next.js 16 + React 19)

---

## Executive Summary

This audit identifies opportunities to improve code maintainability, reduce bugs, improve performance, and align with battle-tested React/Next.js patterns. Issues are sorted by priority based on their impact.

**Overall Assessment:** The codebase is well-structured with good patterns in place (proper cleanup, debouncing, hydration safety). Main opportunities lie in parallelizing async operations, adding request cancellation, and considering data fetching libraries.

---

## Priority 1: CRITICAL - Eliminating Waterfalls

### 1.1 Sequential Auth Checks Should Be Parallel

**Files:** `src/app/(main)/page.tsx` (lines 40-51)

**Issue:** Two independent async operations run sequentially when they could run in parallel. This adds unnecessary latency on every page load.

**Current Code:**

```typescript
useEffect(() => {
  async function loadAuthAndConnection() {
    const authenticated = await checkAuth(); // Wait for auth
    if (!authenticated) {
      router.push('/auth/login');
      return;
    }
    await checkConnection(); // Then wait for connection
  }
  loadAuthAndConnection();
}, [checkAuth, checkConnection, router]);
```

**Recommended Fix:**

```typescript
useEffect(() => {
  async function loadAuthAndConnection() {
    // Run both checks in parallel
    const [authenticated, connected] = await Promise.all([checkAuth(), checkConnection()]);

    if (!authenticated) {
      router.push('/auth/login');
      return;
    }
    // connected is already available, no extra wait
  }
  loadAuthAndConnection();
}, [checkAuth, checkConnection, router]);
```

**Impact:** Reduces initial page load time by running checks concurrently.

---

### 1.2 Missing AbortController for Fetch Cleanup

**Files:**

- `src/app/(main)/library/page.tsx` (lines 146-182)
- `src/app/(main)/feed/page.tsx` (similar pattern)
- `src/app/rsvp/RsvpPageClient.tsx` (lines 66-89)

**Issue:** The `cancelled` flag prevents state updates after unmount, but doesn't actually cancel in-flight requests. This wastes bandwidth and can cause memory leaks.

**Current Code:**

```typescript
useEffect(() => {
  if (!isSyncing) return;
  let cancelled = false;

  const poll = async () => {
    try {
      const res = await fetch('/api/sync/readwise/status');
      // fetch continues even if component unmounts
      if (!cancelled) {
        // ...
      }
    }
  };
  // ...
  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
}, [isSyncing, activeSubTab, fetchDocuments]);
```

**Recommended Fix:**

```typescript
useEffect(() => {
  if (!isSyncing) return;
  const controller = new AbortController();

  const poll = async () => {
    try {
      const res = await fetch('/api/sync/readwise/status', {
        signal: controller.signal,
      });
      const data: SyncStatus = await res.json();
      // ...
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Expected on cleanup
      }
      // Handle real errors
    }
  };

  poll();
  const intervalId = setInterval(poll, 3000);

  return () => {
    controller.abort();
    clearInterval(intervalId);
  };
}, [isSyncing, activeSubTab, fetchDocuments]);
```

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

### 5.1 Time Calculations Should Be Memoized

**File:** `src/components/rsvp/RSVPPlayer.tsx` (lines 185-188)

**Issue:** Time calculations run on every render despite depending on stable values.

**Current Code:**

```typescript
// Calculate times - runs every render
const totalSeconds = player.totalWords > 0 ? (player.totalWords / player.wpm) * 60 : 0;
const elapsedSeconds = player.totalWords > 0 ? (player.currentIndex / player.wpm) * 60 : 0;
const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
```

**Recommended Fix:**

```typescript
const { totalSeconds, elapsedSeconds, remainingSeconds } = useMemo(() => {
  const total = player.totalWords > 0 ? (player.totalWords / player.wpm) * 60 : 0;
  const elapsed = player.totalWords > 0 ? (player.currentIndex / player.wpm) * 60 : 0;
  return {
    totalSeconds: total,
    elapsedSeconds: elapsed,
    remainingSeconds: Math.max(0, total - elapsed),
  };
}, [player.totalWords, player.wpm, player.currentIndex]);
```

**Impact:** Reduces unnecessary recalculations during high-frequency updates (RSVP playback).

---

### 5.2 Source Extraction Should Be Memoized

**File:** `src/app/rsvp/RsvpPageClient.tsx` (lines 33-54, 173)

**Issue:** `extractSource()` and `getTextContent()` run on every render.

**Current Code:**

```typescript
const source = extractSource(article);
const text = getTextContent();
```

**Recommended Fix:**

```typescript
const source = useMemo(() => extractSource(article), [article]);
const text = useMemo(() => {
  if (article) {
    if (article.content?.trim()) return article.content;
    if (article.htmlContent) return htmlToPlainText(article.htmlContent);
  }
  return sampleText;
}, [article]);
```

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

| Priority | Issue                         | Effort | Impact |
| -------- | ----------------------------- | ------ | ------ |
| 1        | Parallelize auth checks       | Low    | High   |
| 2        | Add AbortController           | Medium | High   |
| 3        | Direct imports (verify first) | Low    | Medium |
| 4        | Dynamic imports for modals    | Low    | Medium |
| 5        | Add React.cache()             | Medium | Medium |
| 6        | Consider SWR                  | High   | High   |
| 7        | Memoize time calculations     | Low    | Low    |
| 8        | Memoize source extraction     | Low    | Low    |
| 9        | Extract inline SVGs           | Low    | Low    |
| 10       | Memoize date formatting       | Low    | Low    |

---

## Next Steps

1. **Start with quick wins:** Items 1, 3, 4, 7, 8 can be done quickly with minimal risk
2. **Profile before optimizing:** Use React DevTools Profiler to verify re-render issues before adding `useMemo`/`useCallback`
3. **Bundle analysis:** Run `next build --analyze` to verify barrel import impact
4. **Consider SWR incrementally:** Start with one page (e.g., Library) and expand if beneficial
