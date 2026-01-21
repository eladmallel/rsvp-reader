# RSVP Reader UI Redesign Plan

## Overview

Complete UI redesign based on 8 prototype screens in `docs/redesign/prototypes/`. Replace all existing screens with new design system. Work one page at a time, updating E2E tests after each.

---

## Progress Tracker

| Phase                                 | Status               | Notes                                              |
| ------------------------------------- | -------------------- | -------------------------------------------------- |
| Phase 0: Design System Foundation     | ✅ Complete          | Tokens, fonts, and shared UI components done       |
| Phase 1: RSVP Player                  | ✅ Complete          | New Cockpit controls, WordDisplay, Settings panel  |
| Phase 2: Navigation Shell             | ✅ Complete          | Route groups, BottomNav, placeholder pages         |
| Phase 3: Library & Feed               | ✅ Complete          | ArticleListItem, SubTabs, ContinueReadingBanner    |
| Phase 4: Search Screen                | ✅ Complete          | Search API, filter chips, recent searches          |
| Phase 5: Settings Screen              | ✅ Complete          | User preferences API, profile display, toggles     |
| Phase 6: Auth Screens                 | ✅ Complete          | Login, Signup w/ password strength, Connect Reader |
| **Phase 6.5: UI Prototype Alignment** | 🔴 **HIGH PRIORITY** | App-wide alignment to prototype designs            |
| Phase 7: Home Dashboard               | 🔲 Not Started       |                                                    |

---

## ⚠️ CRITICAL: Backend-First Rule

**When building any page, you MUST:**

1. **Build/update backend APIs first** - Never leave backend work for later
2. **Test backend changes** - Write/update API tests before moving to frontend
3. **Update or delete irrelevant existing tests** - Don't leave stale tests
4. **Each page ships complete** - Frontend + Backend + Tests all together

This ensures each phase delivers a fully functional feature, not just UI shells.

---

## Phase 0: Design System Foundation

### 0.1 Update Global Design Tokens

**File**: `src/app/globals.css`

Replace existing tokens with new palette:

```css
/* Light Theme */
--bg-app: #f9f9f7;
--bg-surface: #ffffff;
--bg-surface-elevated: #f0f0ee;
--text-primary: #242424;
--text-secondary: #6b6b6b;
--text-tertiary: #8e8e93;
--border-subtle: #e5e5e5;
--accent: #f2c94c;
--accent-text: #000;
--orp-color: #d93025;
--danger: #ef4444;
--success: #22c55e;

/* Dark Theme */
--bg-app: #151515;
--bg-surface: #1c1c1c;
--bg-surface-elevated: #242424;
--text-primary: #eaeaea;
--text-secondary: #8e8e93;
--text-tertiary: #636366;
--border-subtle: #2c2c2e;
--orp-color: #ff6b6b;
```

### 0.2 Add Fonts to Layout

**File**: `src/app/layout.tsx`

Add IBM Plex Sans, Fraunces, IBM Plex Mono via Google Fonts or local hosting.

### 0.3 Create Shared UI Components

**New files in `src/components/ui/`**:

- `BottomNav.tsx` - 5-tab navigation (Home, Library, Feed, Search, Settings)
- `TopBar.tsx` - Flexible header with back button, title, actions
- `ToggleSwitch.tsx` - iOS-style toggle
- `Stepper.tsx` - Increment/decrement control
- `FilterChip.tsx` - Pill-style filter button
- `Icon.tsx` - SVG icon component

---

## Phase 1: RSVP Player (Priority: Highest)

**Reference**: `docs/redesign/prototypes/rsvp-player.html`

### 1.1 Restructure Player Components

**Files to modify/create**:

- `src/components/rsvp/RSVPPlayer.tsx` - Complete rewrite
- `src/components/rsvp/RSVPPlayer.module.css` - New styles
- `src/components/rsvp/Cockpit.tsx` - New bottom controls panel
- `src/components/rsvp/ProgressSection.tsx` - Progress bar + times
- `src/components/rsvp/WordDisplay.tsx` - Update styling

### 1.2 New Layout Structure

```
┌─────────────────────────┐
│ ← [Settings] [Menu]     │  <- Top bar (80px)
│     SOURCE              │
│   Article Title         │
├─────────────────────────┤
│                         │
│    ┌───────────────┐    │
│    │   W O R D     │    │  <- Word stage (centered)
│    │      │        │    │     with ORP marker
│    └───────────────┘    │
│                         │
├─────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━━━━ │  <- Progress bar
│ 00:00   50%      02:30  │
│                         │
│    [◀] [▶ PLAY] [▶]     │  <- Main controls
│                         │
│  WPM [- 320 +]  Skip [-3+] │ <- Secondary controls
└─────────────────────────┘   <- Cockpit (200px)
```

### 1.3 Key Features

- Play/pause button (yellow accent, 56px)
- Skip back/forward buttons (44px) with dynamic labels showing skip amount
- WPM stepper (120-900 range, ±10)
- Skip amount stepper (1-20 words)
- Settings panel overlay for theme/font
- Full-screen mode (no bottom nav)

### 1.4 Update E2E Tests

**File**: `tests/e2e/rsvp.spec.ts`

- Test new controls layout
- Test WPM stepper interaction
- Test skip amount stepper
- Test settings panel toggle
- Screenshots: mobile/desktop, light/dark

---

## Phase 2: Navigation Shell & Route Structure

### 2.1 Create App Shell Layout

**New file**: `src/app/(main)/layout.tsx`

Wraps main screens with bottom navigation. Uses route groups to separate:

- `(main)/` - Screens with bottom nav
- `rsvp/` - Full-screen player (no nav)
- `auth/` - Auth screens (no nav)

### 2.2 New Route Structure

```
src/app/
  (main)/
    layout.tsx         <- Shell with BottomNav
    page.tsx           <- Home dashboard (placeholder initially)
    library/page.tsx   <- Library (moved)
    feed/page.tsx      <- Feed (NEW)
    search/page.tsx    <- Search (NEW)
    settings/page.tsx  <- Settings (NEW)
  rsvp/page.tsx        <- Player (no nav)
  auth/
    login/page.tsx
    signup/page.tsx
    connect-reader/page.tsx
```

### 2.3 Bottom Navigation Component

**File**: `src/components/ui/BottomNav.tsx`

- 5 items: Home, Library, Feed, Search, Settings
- Active state highlighting based on pathname
- Safe area padding for notched devices
- Fixed at bottom, 72px height

### 2.4 E2E Tests for Navigation Shell

**File**: `tests/e2e/navigation.spec.ts` (NEW)

- Test bottom nav renders on main screens
- Test active state matches current route
- Test navigation between tabs
- Test nav is hidden on RSVP player and auth screens
- Screenshots of nav in different states

---

## Phase 3: Library & Feed Screens

**Reference**: `docs/redesign/prototypes/library-feed.html`

### 3.1 Library Page

**File**: `src/app/(main)/library/page.tsx`

**Features**:

- Sub-tabs: Inbox | Later | Archive (maps to location filter)
- Article list with:
  - Unread dot indicator
  - Source icon + name (uppercase)
  - Title + optional tags
  - Preview text (2 lines)
  - Author + read time
  - Optional thumbnail (56x56)
- "Continue reading" floating banner

### 3.2 Feed Page

**File**: `src/app/(main)/feed/page.tsx`

**Features**:

- Sub-tabs: Unseen | Seen
- Same article list component
- Uses `location=feed` filter

### 3.3 Shared Component

**File**: `src/components/library/ArticleListItem.tsx`

- Reusable article row component
- Props: article data, onClick, showUnread

### 3.4 E2E Tests

**File**: `tests/e2e/library.spec.ts`

- Update for new layout
- Test sub-tab switching
- Test article list
- Test continue reading banner
- Screenshots

---

## Phase 4: Search Screen (NEW)

**Reference**: `docs/redesign/prototypes/search.html`

### 4.1 Create Search Page

**File**: `src/app/(main)/search/page.tsx`

**States**:

1. Empty: Recent searches list
2. Results: Article list with highlighted matches
3. No results: Empty state message

**Features**:

- Search input with clear button
- Filter chips: All | Library | Feed | Highlights
- Recent searches (localStorage)
- Results with `<mark>` highlighting

### 4.2 E2E Tests

**File**: `tests/e2e/search.spec.ts` (NEW)

- Test search input
- Test filter chips
- Test recent searches
- Test results display
- Test no results state
- Screenshots

---

## Phase 5: Settings Screen (NEW)

**Reference**: `docs/redesign/prototypes/settings.html`

### 5.1 Create Settings Page

**File**: `src/app/(main)/settings/page.tsx`

**Sections**:

1. Profile card: Avatar (initials), name, email, Pro badge
2. Integrations: Readwise Reader (connected/disconnected status)
3. Reading Preferences: Default WPM, Skip amount, RSVP font
4. Appearance: Dark mode toggle, System theme toggle
5. Support: Help & FAQ, Contact Support, Privacy Policy
6. Account: Log out (red)
7. Footer: Version number

### 5.2 E2E Tests

**File**: `tests/e2e/settings.spec.ts` (NEW)

- Test profile display
- Test preference controls
- Test toggle switches
- Test logout
- Screenshots

---

## Phase 6: Auth Screens Redesign

**References**:

- `docs/redesign/prototypes/auth-login.html`
- `docs/redesign/prototypes/auth-signup.html`
- `docs/redesign/prototypes/auth-connect-readwise.html`

### 6.1 Login Page

**File**: `src/app/auth/login/page.tsx`

- Centered layout, max-width 400px
- Logo + "RSVP Reader" header
- Email/password form
- "Forgot password?" link
- Yellow "Sign In" button
- Divider "or"
- Social buttons: Google, GitHub
- Footer: "Don't have an account? Sign up"
- Theme toggle top-right

### 6.2 Signup Page

**File**: `src/app/auth/signup/page.tsx`

- Same layout as login
- Password strength indicator (4 bars)
- Terms/Privacy links

### 6.3 Connect Reader Page

**File**: `src/app/auth/connect-reader/page.tsx`

- Integration card with logo connection graphic
- Feature list (3 items with checkmarks)
- Token input with paste button
- "Connect Readwise" button
- "Skip for now" link
- Success state with "Go to Library" button

### 6.4 E2E Tests

**File**: `tests/e2e/auth.spec.ts`

- Update all existing tests for new layouts
- Test theme toggle
- Screenshots for all 3 screens

---

## Phase 6.5: UI Prototype Alignment (Priority: HIGH - Must complete before Phase 7)

> **⚠️ CRITICAL**: All screens must EXACTLY match their corresponding HTML prototype files. This phase addresses gaps found between current implementation and prototype designs.

**Goal**: Ensure every page in the app matches its prototype design pixel-perfectly. The prototypes in `docs/redesign/prototypes/` are the source of truth for all visual design.

### 6.5.0 CRITICAL: Route Architecture Fix (BLOCKING ISSUE)

> **🚨 BLOCKING**: The bottom navigation is NOT visible because of a routing architecture issue.

**Root Cause**:

There are **two** conflicting `page.tsx` files:

1. `/src/app/page.tsx` (OLD) - 412 lines, uses old design with "RSVP Reader" header, TabBar, TagFilter
2. `/src/app/(main)/page.tsx` (NEW) - 108 lines, uses `(main)` layout with BottomNav

When users visit `http://localhost:3000/`, Next.js routes to `/src/app/page.tsx` (the OLD file), completely bypassing the `(main)` route group and its layout with BottomNav.

**Current File Structure (PROBLEMATIC)**:

```
src/app/
├── page.tsx              ← OLD: Catches "/" route, NO bottom nav
├── page.module.css       ← OLD styles
├── (main)/
│   ├── layout.tsx        ← NEW: Has BottomNav
│   ├── page.tsx          ← NEW: Home dashboard (NEVER REACHED for "/" )
│   ├── library/page.tsx  ← NEW library (reached via "/library")
│   ├── feed/page.tsx     ← NEW feed
│   └── ...
```

**Required Fix**:

1. DELETE `/src/app/page.tsx` and `/src/app/page.module.css` (old files)
2. The `(main)` route group with its layout.tsx containing BottomNav will then catch the "/" route
3. Migrate any unique functionality from old page.tsx into `(main)/page.tsx` or `(main)/library/page.tsx`

**Files to Delete**:

- `src/app/page.tsx` (old 412-line file)
- `src/app/page.module.css` (old styles)

**Files to Keep/Update**:

- `src/app/(main)/layout.tsx` - This has the BottomNav
- `src/app/(main)/page.tsx` - Home dashboard (will now serve "/")
- `src/app/(main)/library/page.tsx` - Library page (serves "/library")

**Verification**:

After deletion, visiting `http://localhost:3000/` should show:

- Bottom navigation with 5 tabs (Home, Library, Feed, Search, Settings)
- The new home dashboard UI (not "RSVP Reader" header)

---

### 6.5.1 Global Navigation & Shell Alignment

**Reference**: All prototype files use consistent bottom navigation

**Current Gaps**:

- Bottom nav implementation exists in `(main)` layout but is not reached due to routing issue above
- Once routing is fixed, verify styling matches prototypes exactly
- Need to verify `--nav-bg` CSS variable is properly defined in both themes

**Files to Review/Update**:

- `src/components/ui/BottomNav.tsx` - Verify structure matches prototypes
- `src/components/ui/BottomNav.module.css` - Match exact styling
- `src/components/ui/Icon.tsx` - Verify icons match prototype SVGs exactly
- `src/app/globals.css` - Ensure all nav-related CSS variables are defined

**Checklist**:

- [x] **DELETE old `/src/app/page.tsx` and `/src/app/page.module.css`** (blocking issue)
- [x] Bottom nav height is exactly `72px` (72px + safe area inset)
- [x] Nav background uses `var(--nav-bg)` (light: #ffffff, dark: #1c1c1c)
- [x] Border-top is `1px solid var(--border-subtle)`
- [x] Nav item icons are `24px × 24px`
- [x] Nav item labels are `0.7rem`, weight 500
- [x] Active state uses `var(--text-primary)`, inactive uses `var(--text-tertiary)`
- [x] Max-width inner container is `560px` (900px on desktop)

### 6.5.1b RSVP Player Alignment

**Reference**: `docs/redesign/prototypes/rsvp-player.html`

**Current Gaps**:

The RSVP player page has **multiple structural issues**:

1. **Missing title/source in player header**: The RSVPPlayer component accepts `title` and `source` props but `RsvpPageClient.tsx` doesn't pass them:

   ```tsx
   // Current (WRONG):
   <RSVPPlayer
     text={text}
     articleId={articleId || 'demo'}
     onExit={handleExit}
     initialWpm={300}
     className={styles.playerContainer}
   />

   // Should be:
   <RSVPPlayer
     text={text}
     articleId={articleId || 'demo'}
     onExit={handleExit}
     initialWpm={300}
     title={article?.title}
     source={extractSource(article)}  // e.g., "X.COM"
     className={styles.playerContainer}
   />
   ```

2. **Duplicate header**: `RsvpPageClient.tsx` has its own header (lines 151-161) PLUS RSVPPlayer has its own header. The page header should be removed - the RSVPPlayer should be the only full-screen component.

3. **Page layout not full-screen**: The RSVP page should be a full-screen immersive experience matching the prototype (no external header/footer).

**Files to Update**:

- `src/app/rsvp/RsvpPageClient.tsx` - Pass title/source props, remove duplicate header
- `src/app/rsvp/page.module.css` - Adjust for full-screen layout
- `src/components/rsvp/RSVPPlayer.module.css` - Verify matches prototype styling

**Checklist**:

- [x] Pass `title` prop to RSVPPlayer
- [x] Pass `source` prop to RSVPPlayer (extract from article URL or siteName)
- [x] Remove duplicate page header from RsvpPageClient
- [x] Make RSVP page full-screen (no page.module.css container)
- [x] Article source shows centered above title (uppercase, 0.7rem, tertiary color)
- [x] Article title shows centered below source (1rem, weight 600, single line ellipsis)
- [x] Header height matches prototype (`--header-height: 80px`)
- [x] Cockpit height matches prototype (`--cockpit-height: 200px`)

---

### 6.5.2 Library & Feed Page Alignment

**Reference**: `docs/redesign/prototypes/library-feed.html`

**Current Gaps**:

- Fixed header structure may not match prototype layout
- Sub-tabs styling needs verification
- Page title + count styling needs exact match
- Top bar icons (hamburger menu, add, more options) layout

**Files to Review/Update**:

- `src/app/(main)/library/page.tsx`
- `src/app/(main)/library/page.module.css`
- `src/app/(main)/feed/page.tsx`
- `src/app/(main)/feed/page.module.css`
- `src/components/library/SubTabs.tsx`
- `src/components/library/SubTabs.module.css`

**Checklist**:

- [x] Header is fixed with proper z-index (10)
- [x] Header height is `120px` (--header-height)
- [x] Top bar has hamburger menu button (left) + action buttons (right)
- [x] Page title is `2rem`, weight 700, letter-spacing `-0.02em`
- [x] Page count next to title is `2rem`, weight 400, color `var(--text-tertiary)`
- [x] Sub-tabs are fixed below header with border-bottom
- [x] Sub-tab active state: background `var(--bg-surface-elevated)`, color `var(--text-primary)`
- [x] Content area has proper padding for fixed header + sub-tabs + bottom nav
- [x] Continue reading banner component exists (integration pending)

### 6.5.3 Home Dashboard Alignment

**Reference**: `docs/redesign/prototypes/home.html`

**Status**: ⏸️ **DEFERRED** - Home tab intentionally left as placeholder for now

**Checklist**:

- [~] All items deferred - home dashboard to be implemented later

### 6.5.4 Search Page Alignment

**Reference**: `docs/redesign/prototypes/search.html`

**Current Gaps**:

- Verify search input styling matches (48px height, 12px border-radius)
- Filter chips styling and active states
- Recent searches list styling
- Search results with `<mark>` highlighting

**Files to Review/Update**:

- `src/app/(main)/search/page.tsx`
- `src/app/(main)/search/page.module.css`
- `src/components/ui/FilterChip.tsx`
- `src/components/ui/FilterChip.module.css`

**Checklist**:

- [x] Search input: 48px height, 12px border-radius, 1rem font
- [x] Focus state: accent border + box-shadow glow
- [x] Clear button: 28px, only shows when input has text
- [x] Filter chips: 20px border-radius, proper padding
- [x] Active chip: accent background, black text
- [x] Recent items: 32px icon container, 8px border-radius
- [x] Results: source icon 18px, title `1rem` weight 600
- [x] Mark tags: use `var(--highlight-bg)` for highlights

### 6.5.5 Settings Page Alignment

**Reference**: `docs/redesign/prototypes/settings.html`

**Current Gaps**:

- Profile card styling (avatar gradient, badge)
- Settings sections with proper grouping
- Settings items with icon containers
- Connection status indicators (green dot)

**Files to Review/Update**:

- `src/app/(main)/settings/page.tsx`
- `src/app/(main)/settings/page.module.css`
- `src/components/ui/ToggleSwitch.tsx`
- `src/components/ui/ToggleSwitch.module.css`

**Checklist**:

- [x] Profile avatar: 56px, gradient background
- [x] Profile badge: uppercase, accent bg, 0.7rem font
- [x] Settings cards: 12px border-radius, grouped items
- [x] Settings item icons: 32px × 32px, 8px border-radius
- [x] Chevron arrows for navigable items
- [x] Toggle switches: 52px × 32px, 24px knob
- [x] Active toggle: accent bg, black knob
- [x] Connection status: 8px dot, green for connected
- [x] Version footer: centered, 0.75rem, tertiary color

### 6.5.6 CSS Variables & Design Tokens

**Reference**: All prototypes define consistent CSS variables

**Ensure globals.css has ALL these variables**:

```css
/* Light Theme */
--bg-app: #f9f9f7;
--bg-surface: #ffffff;
--bg-surface-elevated: #f0f0ee;
--text-primary: #242424;
--text-secondary: #6b6b6b;
--text-tertiary: #8e8e93;
--border-subtle: #e5e5e5;
--accent: #f2c94c;
--accent-text: #000;
--nav-bg: #ffffff;
--stat-bg: rgba(242, 201, 76, 0.12);
--highlight-bg: rgba(242, 201, 76, 0.3);
--tag-bg: #e8e8e6;
--tag-text: #6b6b6b;
--unread-dot: #007aff;
--danger: #ef4444;
--success: #22c55e;

/* Dark Theme */
--bg-app: #151515;
--bg-surface: #1c1c1c;
--bg-surface-elevated: #242424;
--text-primary: #eaeaea;
--text-secondary: #8e8e93;
--text-tertiary: #636366;
--border-subtle: #2c2c2e;
--nav-bg: #1c1c1c;
--stat-bg: rgba(242, 201, 76, 0.08);
--highlight-bg: rgba(242, 201, 76, 0.25);
--tag-bg: #2c2c2e;
--tag-text: #8e8e93;
```

### 6.5.7 Typography & Spacing Constants

**Status**: ✅ **VERIFIED** - All typography is consistent app-wide

**Verified consistency**:

| Element          | Size         | Weight  | Letter-spacing | Status |
| ---------------- | ------------ | ------- | -------------- | ------ |
| Page title (h1)  | 2rem         | 700     | -0.02em        | ✅     |
| Section title    | 1.1rem       | 600     | -              | ✅     |
| Settings section | 0.75rem      | 600     | 0.05em         | ✅     |
| Article title    | 1rem-1.05rem | 600     | -              | ✅     |
| Source name      | 0.7rem       | 600     | 0.03em         | ✅     |
| Meta text        | 0.75-0.8rem  | 400-500 | -              | ✅     |
| Nav item label   | 0.7rem       | 500     | -              | ✅     |

**Changes made**:

- Standardized source name styling to 0.7rem with `--text-tertiary` color across ArticleListItem, Search, and RSVP player

### 6.5.8 E2E Tests & Visual Verification

**File**: `tests/e2e/visual-alignment.spec.ts` (NEW)

Create a new E2E test file specifically for visual alignment verification:

- [ ] Capture screenshots of all main screens at mobile (375×667) viewport
- [ ] Capture screenshots at desktop (1440×900) viewport
- [ ] Test both light and dark themes
- [ ] Verify bottom nav appears on all main screens
- [ ] Verify bottom nav is hidden on RSVP player and auth screens
- [ ] Compare key measurements (use Playwright's `toHaveCSS` assertions)

**Manual verification**:

For each screen, open the prototype HTML file in a browser side-by-side with the live app and verify:

1. Overall layout matches
2. Colors and contrast match
3. Typography sizes and weights match
4. Spacing and padding match
5. Interactive states (hover, active, focus) match

---

## Phase 7: Home Dashboard (Priority: Lowest)

**Reference**: `docs/redesign/prototypes/home.html`

### 7.1 Create Home Page

**File**: `src/app/(main)/page.tsx`

**Sections**:

1. Greeting: "Good evening, [Name]" + waiting articles count
2. Stats grid: 2 cards (articles this week, time saved)
3. Continue reading card: thumbnail, source, title, progress
4. Quick actions: Library button, Feed button
5. Recently added: article list (3-5 items)

### 7.2 E2E Tests

**File**: `tests/e2e/home.spec.ts` (rename from homepage.spec.ts)

- Test greeting display
- Test stats cards
- Test continue reading card
- Test navigation to library/feed
- Screenshots

---

## Backend & Database Changes

### New API Endpoints

#### User Stats (for Home Dashboard)

**File**: `src/app/api/user/stats/route.ts`

```typescript
GET / api / user / stats;
Response: {
  articlesThisWeek: number;
  articlesLastWeek: number;
  timeSavedMinutes: number;
  timeSavedMonth: number;
}
```

#### Continue Reading (for Home Dashboard)

**File**: `src/app/api/user/continue-reading/route.ts`

```typescript
GET /api/user/continue-reading
Response: {
  article?: {
    id: string;
    title: string;
    source: string;
    thumbnail?: string;
    progress: number;
    minutesLeft: number;
  }
}
```

#### User Preferences (for Settings)

**File**: `src/app/api/user/preferences/route.ts`

```typescript
GET /api/user/preferences
Response: { defaultWpm, skipAmount, rsvpFont, theme }

PUT /api/user/preferences
Body: { defaultWpm?, skipAmount?, rsvpFont?, theme? }
Response: { success: true }
```

#### Search (for Search Screen)

**File**: `src/app/api/search/route.ts`

```typescript
GET /api/search?q=query&filter=all|library|feed|highlights
Response: {
  results: SearchResult[];
  count: number;
}

interface SearchResult {
  id: string;
  title: string;
  titleHighlight: string;  // with <mark> tags
  snippet: string;
  snippetHighlight: string;
  source: string;
  author: string;
  readTime: string;
  tags: string[];
  thumbnail?: string;
}
```

### Database Schema Changes

#### Add columns to `users` table

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_wpm INTEGER DEFAULT 300;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skip_amount INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rsvp_font TEXT DEFAULT 'monospace';
-- theme column may already exist, check first
```

#### New table: `reading_stats` (for Home Dashboard stats)

```sql
CREATE TABLE IF NOT EXISTS reading_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  article_title TEXT,
  words_read INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reading_stats_user_id ON reading_stats(user_id);
CREATE INDEX idx_reading_stats_read_at ON reading_stats(user_id, read_at);

-- RLS policies
ALTER TABLE reading_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading stats"
  ON reading_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading stats"
  ON reading_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### New table: `reading_progress` (for Continue Reading)

```sql
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  article_title TEXT,
  article_source TEXT,
  article_thumbnail TEXT,
  word_index INTEGER NOT NULL DEFAULT 0,
  total_words INTEGER NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, article_id)
);

CREATE INDEX idx_reading_progress_user_last_read ON reading_progress(user_id, last_read_at DESC);

-- RLS policies
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reading progress"
  ON reading_progress FOR ALL
  USING (auth.uid() = user_id);
```

### Migration File

**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_redesign_tables.sql`

Contains all the above SQL statements in a single migration.

---

## Files to Delete After Completion

Once all new screens are working with passing tests:

- Old component files that were completely replaced
- Old CSS module files with deprecated styles
- Any unused utility functions
- **Chat feature entirely**: `/chat` route, `src/components/chat/`, `tests/e2e/chat.spec.ts`

---

## Verification Steps

After each phase:

1. Run `npm run test` - Unit tests pass
2. Run `npm run test:e2e` - E2E tests pass
3. Run `npm run type-check` - No TypeScript errors
4. Run `npm run lint` - No lint errors
5. Capture screenshots and review against prototypes
6. Commit with appropriate message

---

## Critical Files Reference

| Purpose          | File Path                                   |
| ---------------- | ------------------------------------------- |
| Design tokens    | `src/app/globals.css`                       |
| Root layout      | `src/app/layout.tsx`                        |
| RSVP Player      | `src/components/rsvp/RSVPPlayer.tsx`        |
| Player prototype | `docs/redesign/prototypes/rsvp-player.html` |
| E2E test pattern | `tests/e2e/rsvp.spec.ts`                    |
| Current library  | `src/app/page.tsx`                          |
| API routes       | `src/app/api/`                              |
| DB migrations    | `supabase/migrations/`                      |

---

## Commit Message Prefixes

- `style:` - CSS/design token changes
- `feat:` - New components or features
- `refactor:` - Rewriting existing code
- `test:` - Test additions/updates
- `chore:` - Cleanup, deletions
- `docs:` - README/documentation updates
- `db:` - Database migrations
