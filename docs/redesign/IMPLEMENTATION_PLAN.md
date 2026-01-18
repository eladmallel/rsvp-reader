# RSVP Reader UI Redesign Plan

## Overview

Complete UI redesign based on 8 prototype screens in `docs/redesign/prototypes/`. Replace all existing screens with new design system. Work one page at a time, updating E2E tests after each.

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
