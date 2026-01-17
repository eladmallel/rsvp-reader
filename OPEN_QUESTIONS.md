# Open Questions

> Track uncertainties and decisions that need input. See [AGENTS.md](./AGENTS.md) for format guidelines.

---

## [2026-01-16] RSVP Player Integration with Real Content

**Context**: The RSVP page now fetches real article content from the API. Need to decide how to handle different content formats.

**Question**: How should we handle articles that only have HTML content vs plain text?

**Options Considered**:

1. Always strip HTML tags client-side - Simple but loses formatting context
2. Use a library like html-to-text for better conversion - More dependencies
3. Parse HTML server-side and return plain text - More consistent but requires API changes

**My Recommendation**: Option 1 (client-side stripping) for now as it's the simplest. Can upgrade later if needed.

**Status**: [x] Resolved - Using client-side HTML stripping for simplicity

---

## [2026-01-16] Reading Session Tracking

**Context**: Phase 4 will implement reading session tracking. Need to decide on the data model.

**Question**: What data should we track per reading session?

**Options Considered**:

1. Minimal: start_time, end_time, article_id, last_word_index
2. Detailed: Add wpm_history, pause_count, completion_percentage
3. Full analytics: Add eye-tracking placeholders, comprehension metrics

**My Recommendation**: Start with Option 1, add fields as needed.

**Status**: [ ] Open

---

## [2026-01-16] Readwise List Endpoint HTML Support

**Context**: Background sync should minimize requests by pulling HTML content in bulk if possible.

**Question**: Does the Readwise list endpoint support returning full `html_content` (or similar) so we can avoid per-document fetches?

**Options Considered**:

1. List endpoint supports HTML content (best case; fewer requests)
2. List endpoint does not support HTML content (need per-document fetches within budget)

**My Recommendation**: Prefer Option 1 if the API supports it; otherwise keep per-document fetches limited to the remaining request budget.

**Status**: [ ] Open

---
