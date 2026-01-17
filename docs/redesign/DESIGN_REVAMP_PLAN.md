# UI/UX Redesign Plan: "Flow State"

## 1. Design Philosophy

The goal is to reduce cognitive load to zero. The interface should disappear, leaving only the words.

- **Aesthetic**: "Modern Humanist". Clean lines, but warm tones. Not clinical.
- **Interaction**: "Fluid". Swipe gestures, instant transitions, large touch targets.
- **Typography**: The core of the app. We will use a high-readability Sans-Serif for UI and a dedicated Monospace or specialized Sans for the RSVP window.

## 2. Visual Identity (The "Readwise" Vibe)

### Color Palette

- **Light Mode**: Warm Paper (`#F9F9F7`) background with Charcoal (`#242424`) text.
- **Dark Mode**: Deep Ink (`#151515`) background with Off-White (`#EAEAEA`) text.
- **Brand/Accent**: "Highlighter Yellow" (`#F2C94C`) for primary actions and ORP highlighting.
- **Secondary**: "Focus Indigo" (`#5E5CE6`) for active states.

### Typography

- **UI Font**: `Inter` or System Sans-Serif (Clean, legible at small sizes).
- **RSVP Font**: `JetBrains Mono` or `Roboto Mono`. Monospace is superior for RSVP as it reduces jitter when word lengths change rapidly.

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

### 3.1 List Views (Library & Feed)

**Goal**: Scannability.

- **Layout**: Clean vertical list. No heavy borders.
- **Item Design**:
  - **Title**: Bold, primary text color.
  - **Meta**: Small, secondary color (Source • Reading Time).
  - **Status**: A subtle dot or bar indicating "New", "In Progress", "Finished".
  - **Thumbnail**: Small square on the right (optional, if available) or a nice generated icon based on the tag.
- **Interactions**:
  - **Swipe Right**: Mark as Done / Archive.
  - **Swipe Left**: Save to Favorites / Open Options.
  - **Pull to Refresh**: Sync with Readwise.

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
  - **Scrubber**: Full-width progress bar / waveform representation.
  - **Primary Controls**: Large Play/Pause button in center. Skip Back (15s/sentence) and Skip Forward buttons on sides.
  - **Secondary Controls**: WPM selector (bottom left), Theme/Font settings (bottom right).

### 3.3 Settings Tab

**Goal**: Set and forget.

- **Connect Readwise**: A friendly, branded card. "Connect to Reader" button using Readwise colors.
- **Preferences**: Toggle switches for "Dark Mode", "Auto-Archive", "Haptics".
- **Account**: Simple profile card.

### 3.4 Search Tab

**Goal**: Fast retrieval.

- **Input**: Large search bar at top, auto-focus on enter.
- **Results**: Reuses the List View item design.
- **Filters**: Chips for "Library" vs "Feed" or Tags.

---

## 4. Implementation Strategy

1.  **Design Tokens**: Define CSS variables for the new palette.
2.  **Layout Shell**: Create a mobile-responsive shell (max-width container on desktop).
3.  **Component Refactor**: Update `ArticleList`, `RSVPPlayer`, and `Settings` to use new tokens.
