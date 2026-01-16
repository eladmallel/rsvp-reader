---
name: Phase 1 Design Prototypes
overview: 'Implement Phase 1 of the RSVP Reader project: create design tokens, build mobile-first UX prototypes for Library/RSVP/Chat views, add dark/light theme toggle, and implement RTL support for Hebrew text.'
todos:
  - id: '1.1'
    content: Create design tokens CSS file with colors, typography, spacing, and animations
    status: completed
  - id: '1.2'
    content: Build mobile Library view prototype with article cards, tab bar, and tag filter
    status: in_progress
  - id: '1.3'
    content: Build mobile RSVP view prototype with ORP display and playback controls
    status: pending
  - id: '1.4'
    content: Build mobile Chat view prototype with message bubbles and input
    status: pending
  - id: '1.5'
    content: Build desktop layouts for Library and RSVP views
    status: pending
  - id: '1.6'
    content: Implement dark/light mode toggle with system preference detection
    status: pending
  - id: '1.7'
    content: Add RTL support for Hebrew text
    status: pending
  - id: '1.8'
    content: Measure CI time and optimize if needed
    status: pending
---

# Phase 1: Design Phase (UX Prototypes)

## Overview

This phase focuses on creating interactive HTML/CSS prototypes for all key screens before building full functionality. The goal is to establish visual design, test UX patterns, and create a foundation for subsequent phases.

## Prerequisites

- Phase 0.7 (CI baseline measurement) is still in progress - Task 1.8 will reference that baseline once available

---

## Commit & Testing Workflow (Applies to ALL Tasks)

**Every task follows this workflow:**

1. **Write tests first** (or alongside) for each component/feature
2. **Verify all tests pass** before committing: `npm run test && npm run test:e2e`
3. **Make small, focused commits** - one logical change per commit
4. **Never commit with failing tests** - all tests must be green
5. **Push after each commit** for visibility

**Test requirements per task type:**

- **Components**: Unit tests with React Testing Library (render, accessibility, props)
- **CSS/Styling**: E2E screenshot tests for visual regression (mobile + desktop, dark + light)
- **Theme/Context**: Unit tests for state logic, E2E tests for user interaction
- **RTL Support**: Unit tests for direction detection, E2E tests with Hebrew sample text

**Commit message format:** `<type>: <short description>`

- Examples: `feat: add design tokens CSS`, `test: add ArticleCard component tests`

## File Structure

```
src/
├── app/
│   ├── globals.css           # Design tokens + base styles (modify)
│   ├── layout.tsx            # Add theme provider logic
│   ├── page.tsx              # Replace with Library view
│   ├── library/
│   │   └── page.tsx          # Library view component
│   ├── rsvp/
│   │   └── page.tsx          # RSVP reading prototype
│   └── chat/
│       └── page.tsx          # Chat view prototype
├── components/
│   ├── ui/
│   │   ├── ThemeToggle.tsx   # Dark/light mode switch
│   │   └── ThemeToggle.module.css
│   ├── library/
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleCard.module.css
│   │   ├── TabBar.tsx
│   │   └── TagFilter.tsx
│   ├── rsvp/
│   │   ├── WordDisplay.tsx   # ORP-highlighted word
│   │   ├── WordDisplay.module.css
│   │   ├── ProgressBar.tsx
│   │   └── Controls.tsx
│   └── chat/
│       ├── ChatBubble.tsx
│       └── ChatInput.tsx
└── lib/
    └── theme/
        └── ThemeContext.tsx  # Theme state management
```

---

## Task 1.1: Create Design Tokens CSS File

Update [src/app/globals.css](src/app/globals.css) with the design tokens from PROJECT_PLAN.md section 2.3:

- Color palette for dark mode (primary theme)
- Color palette for light mode
- Typography variables (font families, sizes)
- Spacing scale
- Animation/transition values
- CSS custom properties with `data-theme` attribute support for theme switching

Key tokens from PROJECT_PLAN.md:

```css
/* Dark Mode */
--bg-primary: #0a0a0b;
--accent-primary: #ef4444; /* ORP highlight red */

/* Typography */
--font-reading: 'Inter', -apple-system, sans-serif;
--font-size-rsvp: clamp(1.5rem, 6vw, 3rem);
```

**Tests before commit:**

- E2E test that verifies design tokens are applied (screenshot test)
- Run `npm run test && npm run test:e2e` - all green before commit

---

## Task 1.2: Build Mobile Library View Prototype

Create the main Library screen with:

- Tab bar (Library | Feed | History)
- Article cards showing: title, author, site, reading time, tags
- Tag filter chips at top
- Mobile-first layout (375px width target)
- Placeholder/mock data for articles

Components needed:

- `ArticleCard` - displays article metadata
- `TabBar` - navigation between Library/Feed/History
- `TagFilter` - horizontal scrolling tag chips

**Tests before commit:**

- Unit tests for each component (ArticleCard, TabBar, TagFilter)
- E2E screenshot test for mobile Library view (375x667, dark + light)
- Run `npm run test && npm run test:e2e` - all green before commit

---

## Task 1.3: Build Mobile RSVP View Prototype with ORP Display

Create the core RSVP reading experience:

- Center-aligned word display area
- ORP (Optimal Recognition Point) highlighting in red
- Word alignment so ORP character is always centered
- Progress bar at bottom
- Control buttons (play/pause, rewind, forward)
- WPM display and slider
- Exit button

The ORP display uses a three-part layout:

- Left portion (before ORP)
- Center character (ORP, highlighted in red)
- Right portion (after ORP)

This is a static prototype - actual timing/playback comes in Phase 2.

**Tests before commit:**

- Unit tests for WordDisplay (ORP highlighting, alignment), Controls, ProgressBar
- E2E screenshot test for mobile RSVP view (375x667, dark + light)
- Run `npm run test && npm run test:e2e` - all green before commit

---

## Task 1.4: Build Mobile Chat View Prototype

Create the LLM chat interface:

- Chat message bubbles (user vs assistant styling)
- Suggested prompt buttons ("Summarize this", "Key takeaways")
- Text input with send button
- Scrollable message area
- Header with article title and back button

**Tests before commit:**

- Unit tests for ChatBubble, ChatInput components
- E2E screenshot test for mobile Chat view (375x667, dark + light)
- Run `npm run test && npm run test:e2e` - all green before commit

---

## Task 1.5: Build Desktop Layouts (Library, RSVP)

Extend the mobile prototypes for desktop viewports (1440px width target):

- Library: sidebar navigation, wider card grid
- RSVP: larger word display, keyboard control hints
- Shared responsive breakpoints

Use CSS media queries:

- Mobile: up to 768px
- Desktop: 769px and above

**Tests before commit:**

- E2E screenshot tests at desktop viewport (1440x900) for Library and RSVP
- Both dark and light themes
- Run `npm run test && npm run test:e2e` - all green before commit

---

## Task 1.6: Implement Dark/Light Mode Toggle

Create theme switching functionality:

- `ThemeContext` for state management
- `ThemeToggle` component (button/icon)
- System preference detection (`prefers-color-scheme`)
- localStorage persistence
- CSS `data-theme` attribute on `<html>` element
- Smooth transition when switching themes

**Tests before commit:**

- Unit tests for ThemeContext (state logic, localStorage, system preference)
- E2E test for toggle interaction (click toggle, verify theme changes)
- Run `npm run test && npm run test:e2e` - all green before commit

---

## Task 1.7: Add RTL Support for Hebrew Text

Implement bidirectional text support:

- Add `dir` attribute handling (auto/ltr/rtl)
- CSS logical properties where appropriate (`margin-inline-start` vs `margin-left`)
- Test rendering with Hebrew sample text
- RSVP display should work correctly with RTL words

**Tests before commit:**

- Unit test for RTL text direction detection
- E2E test with Hebrew sample text in RSVP view (screenshot)
- Run `npm run test && npm run test:e2e` - all green before commit

---

## Task 1.8: Measure CI Time

After completing prototypes:

- Run full test suite and E2E tests
- Compare to baseline from Phase 0.7
- If CI time increased >10%, investigate and optimize
- Document results in PROJECT_PLAN.md

**No new tests for this task** - this is measurement only. All existing tests must still pass.

---

## Testing Requirements by Task

| Task | Required Tests |

|------|----------------|

| 1.1 Design Tokens | E2E screenshot test verifying tokens apply correctly |

| 1.2 Library View | Unit tests for ArticleCard, TabBar, TagFilter + E2E screenshot |

| 1.3 RSVP View | Unit tests for WordDisplay, Controls + E2E screenshot |

| 1.4 Chat View | Unit tests for ChatBubble, ChatInput + E2E screenshot |

| 1.5 Desktop Layouts | E2E screenshot tests at 1440x900 viewport |

| 1.6 Theme Toggle | Unit tests for ThemeContext + E2E test for toggle interaction |

| 1.7 RTL Support | Unit test for RTL detection + E2E with Hebrew text |

| 1.8 CI Time | No new tests, just measurement |

**Screenshot organization:**

- Location: `screenshots/YYYY-MM-DD/`
- Naming: `<test-name>-<viewport>-<theme>-<state>.png`
- Viewports: mobile (375x667), desktop (1440x900)
- Themes: dark, light

## Key Files to Modify

- [src/app/globals.css](src/app/globals.css) - design tokens
- [src/app/layout.tsx](src/app/layout.tsx) - theme provider, metadata
- [src/app/page.tsx](src/app/page.tsx) - replace with Library view
