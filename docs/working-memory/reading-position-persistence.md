# Working Memory: Reading Position Persistence

## Objective

Implement the ability to store and restore the last word position when reading RSVP, so users can:

1. Pause an article
2. Leave the article page
3. Come back later
4. Resume where they left off when hitting play

## Current Status

- Planning complete
- Starting TDD implementation

## Key Context

- The app uses localStorage for theme persistence (good pattern to follow)
- `useRSVPPlayer` hook manages all reading state including `currentIndex`
- `RSVPPlayer` component wraps the hook
- `RsvpPageClient` fetches article by ID and passes text to RSVPPlayer
- Article ID is available via URL search params (`?id=xxx`)

## Design Decisions

| Decision                          | Rationale                                                     |
| --------------------------------- | ------------------------------------------------------------- |
| Use localStorage (not DB)         | Simple, fast, works offline, no auth required for demo mode   |
| Store per-article position        | Key format: `rsvp-position-{articleId}`                       |
| Create dedicated hook             | `useReadingPosition` - single responsibility, testable        |
| Add initialIndex to useRSVPPlayer | Hook already has `goToIndex`, just need initial state support |
| Save on pause/word change         | Debounce saves to avoid excessive writes                      |

## Implementation Steps

1. [x] Create working memory file
2. [ ] Add `initialIndex` prop to RSVPPlayerConfig
3. [ ] Create `useReadingPosition` hook with tests
4. [ ] Update RSVPPlayer to accept articleId and persist position
5. [ ] Update RsvpPageClient to pass articleId
6. [ ] Write E2E test to verify resume functionality
7. [ ] Run all tests and ensure CI would pass
8. [ ] Commit changes

## Notes

- Use "demo" as the articleId when no real article is loaded
- Clear stored position when article is completed (finished state)
- Debounce delay: 500ms to avoid excessive localStorage writes during playback
