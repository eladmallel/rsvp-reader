# UI/UX Redesign Plan: "Flow State"

## 1. Design Philosophy

The goal is to reduce cognitive load to zero. The interface should disappear, leaving only the words.

- **Aesthetic**: "Modern Humanist". Clean lines, but warm tones. Not clinical.
- **Interaction**: "Fluid". Instant transitions, large touch targets, minimal chrome.
- **Typography**: The core of the app. Use a high-readability Sans-Serif for UI and a purpose-built RSVP font that feels calm and consistent.

## 2. Visual Identity (The "Readwise" Vibe)

### Color Palette

- **Light Mode**: Warm Paper (`#F9F9F7`) background with Charcoal (`#242424`) text.
- **Dark Mode**: Deep Ink (`#151515`) background with Off-White (`#EAEAEA`) text.
- **Brand/Accent**: "Highlighter Yellow" (`#F2C94C`) for primary actions and ORP highlighting.
- **Secondary**: "Focus Indigo" (`#5E5CE6`) for active states.

### Typography

- **UI Font**: `Fraunces` for headlines + `IBM Plex Sans` for UI labels/body (warm, human, not default).
- **RSVP Font**: `IBM Plex Sans Condensed` or `Söhne Condensed` (proportional, tight rhythm, reduces visual jump while avoiding monospaced stiffness).

---

## 3. Page-by-Page Redesign

### 3.0 App Navigation (The Shell)

**Goal**: Seamless switching between browsing modes.

- **Structure**: Bottom Tab Bar (Mobile) / Sidebar (Desktop).
- **Tabs**:
  1.  **Library**: Explicitly saved items (Articles, PDFs, Videos).
  2.  **Feed**: Incoming stream (RSS, Newsletters).
  3.  **Search**: Global search.
  4.  **Settings**: Preferences & Account.
- **Interaction**:
  - Tab bar is persistent in these views.
  - **RSVP Player** is a full-screen overlay that hides the navigation.
  - **Auth Routing**: If logged out, show Login/Signup. If logged in but no Reader token, show Connect Readwise.

### 3.1 List Views (Library & Feed)

**Goal**: Scannability.

- **Layout**: Clean vertical list. No heavy borders.
- **Sub-tabs**: Library/Feed both include a segmented control for **Inbox / Later / Archive** (Readwise-inspired).
- **Item Design**:
  - **Title**: Bold, primary text color.
  - **Meta**: Small, secondary color (Source • Reading Time).
  - **Status**: A subtle dot or bar indicating "New", "In Progress", "Finished".
  - **Thumbnail**: Small square on the right (optional, if available) or a nice generated icon based on the tag.
- **Interactions**:
  - **Overflow Menu**: Mark as Done / Archive / Share / Open Original.
  - **Pull to Refresh**: Sync with Readwise.
  - **Inline Archive**: Quick archive action available on each item (no gestures required).
  - **Empty/Loading/Error**: Beautiful state cards with clear CTAs and helpful copy.

### 3.2 RSVP Player (The Core Experience)

**Goal**: "Now Playing" interface. Merges the article view and reading mode into one cohesive player.

- **Concept**: Borrow from Spotify/Audible. Top 2/3 is content; Bottom 1/3 is anchored controls.
- **Top Zone (The Stage)**:
  - **Header**:
    - **Left**: Back chevron (returns to Library).
    - **Right**: Hamburger/Kebab menu (opens "Article Details", "Chat", "Archive", "Original Text").
  - **The Word**: Vertically centered in the top zone. Massive font.
  - **ORP**: Highlighted character perfectly centered.
- **Bottom Zone (The Cockpit)**:
  - **Anchored**: Always visible (or minimal fade). High contrast or subtle card background.
  - **Collapsible (Small Screens)**: A single tap expands controls; auto-collapses after a short idle.
  - **Scrubber**: Full-width progress bar / waveform representation.
  - **Primary Controls**: Large Play/Pause button in center. Skip Back (words) and Skip Forward (words) on sides.
  - **Secondary Controls**: WPM selector (bottom left), Theme/Font settings (bottom right).
  - **Skip Amount Setting**: User can choose how many words to skip back/forward per tap (e.g., 1/3/5/10).

### 3.3 Settings Tab

**Goal**: Set and forget.

- **Connect Readwise**: A friendly, branded card. "Connect to Reader" button using Readwise colors.
- **Preferences**: Toggle switches for "Dark Mode" and reading preferences (default WPM, skip amount).
- **Account**: Simple profile card with **Log Out** action.

### 3.4 Search Tab

**Goal**: Fast retrieval.

- **Input**: Large search bar at top, auto-focus on enter.
- **Results**: Reuses the List View item design.
- **Filters**: Chips for "Library" vs "Feed" or Tags.

### 3.5 Authentication Screens (Missing Today)

**Goal**: Remove confusion around the first screen and make auth feel simple.

- **Login**: Email/password with optional OAuth later; clear "Create account" CTA.
- **Signup**: Email/password with friendly copy and minimal fields.
- **Connect Readwise**: Token entry with clear explanation and a "Get your token" link.
- **Routing**: Logged-out users always land on Login/Signup, never the Readwise token screen.

### 3.6 Screen Build Order + Feedback Loop

**Priority**: Start from the core value prop and move outward, one screen at a time.

1. **RSVP Player (Single Article)** – Playback controls, ORP display, scrubber, WPM selector
2. **Main Navigation Shell** – Bottom tabs (Library / Feed / Search / Settings)
3. **Secondary Screens** – Settings, search, and AI chat
4. **Auth Screens** – Connect Readwise, login, signup

**Process**: Build one screen, pause for review, and iterate before moving to the next.

---

## 4. Implementation Strategy

1.  **Design Tokens**: Define CSS variables for the new palette (keep ORP red accent).
2.  **Layout Shell**: Create a mobile-responsive shell (max-width container on desktop).
3.  **Component Refactor**: Update `ArticleList`, `RSVPPlayer`, and `Settings` to use new tokens.
4.  **States & Accessibility**:
    - **States**: Build empty/loading/error states for Library, Feed, Search, and RSVP.
    - **A11y Targets**: WCAG AA contrast for text, 44px min tap targets, and reduced-motion support.
5.  **Desktop Minimalism**:
    - **Hover/Focus**: Subtle hover states + clear focus ring for keyboard.
    - **Shortcuts**: Keep existing keyboard shortcuts for RSVP controls.
6.  **Auth Flow Fix**:
    - **Landing**: Logged-out users see Login/Signup.
    - **Next Step**: Logged-in users without Reader token see Connect Readwise.
    - **Settings**: Add Log Out action.
