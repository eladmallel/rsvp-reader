# RSVP Reader - Current Roadmap

**Last Updated**: 2026-01-22
**Status**: Revised post-design prototyping phase

---

## Current Focus & Priorities

### Priority 1: React Best Practices Implementation (Immediate)

**Goal**: Improve code maintainability, reduce bugs, and boost performance

**Status**: Audit complete, implementation pending

**Key Items** (sorted by priority):

1. **CRITICAL**: Parallelize auth checks with `Promise.all()`
2. **CRITICAL**: Add AbortController for proper fetch cancellation
3. **HIGH**: Consider direct imports over barrel files
4. **HIGH**: Add `next/dynamic` for heavy components (settings modals)
5. **MEDIUM**: Add React.cache() for server-side request deduplication
6. **MEDIUM**: Evaluate SWR for data fetching patterns

**Reference**: [REACT-BEST-PRACTICES-AUDIT.md](./REACT-BEST-PRACTICES-AUDIT.md)

**Timeline**: Complete quick wins (items 1-4) this week

---

### Priority 2: Stable DevOps Foundation (In Progress)

**Goal**: Ensure production-ready infrastructure and deployment setup

**Status**: ~80% complete

**Remaining Work**:

- [ ] Implement database secret encryption (Severity 8.0/10)
- [ ] Add API rate limiting (Severity 6.0/10)
- [ ] Complete secret rotation procedures
- [ ] Finalize CI/CD optimizations

**Reference**: [NEXT-STEPS-ANALYSIS.md](./devops/NEXT-STEPS-ANALYSIS.md)

**Timeline**: Complete before major UI work

---

### Priority 3: RSVP Player UI Redesign

**Goal**: Improve reading experience - make it genuinely enjoyable to use

**Current Problem**:

- RSVP player UI is not great
- Reading experience is not enjoyable
- Design doesn't feel polished or refined

**Approach**:

1. Create new design prototypes for RSVP player
2. Test different layouts, controls, and visual treatments
3. Build redesign plan based on prototype learnings
4. Implement new design screen-by-screen
5. Validate with real reading sessions

**Key Areas**:

- Word display and ORP highlighting
- Control placement and accessibility
- Progress visualization
- Speed control UX
- Mobile-first refinement

**Success Criteria**: Reading experience feels smooth, natural, and enjoyable

**Reference**: [DESIGN_REVAMP_PLAN.md](./redesign/DESIGN_REVAMP_PLAN.md)

---

### Priority 4: Complete Readwise API Integration (Future)

**Goal**: Full bidirectional sync with Readwise Reader

**Current State**: Basic integration working (fetch documents, display library)

**Missing Features**:

#### Archive Sync

- [ ] Mark Readwise items as archived when archived in our app
- [ ] Sync archived status from Readwise to our app
- [ ] Hide archived items by default in Library/Feed views
- [ ] Provide UI to show/filter archived items

#### Reading Progress Sync

- [ ] Mark items as read/complete on Readwise when finished in our app
- [ ] Sync reading progress percentage back to Readwise
- [ ] Update "last opened" timestamp

#### Full Bidirectional Sync

- [ ] Real-time sync of new items from Readwise
- [ ] Sync tags and annotations
- [ ] Handle conflicts and edge cases
- [ ] Implement efficient polling/webhook strategy

**Reference**:

- [readwise-sync-plan.md](./readwise-sync-plan.md)
- [reader-archive-sync-plan.md](./reader-archive-sync-plan.md)

---

## Completed Recently

### ✅ Phase 0-3: Core Infrastructure & Reading Engine

- [x] Project setup with Next.js, TypeScript, Supabase
- [x] RSVP engine implementation (ORP, timing, tokenization)
- [x] Basic Readwise integration (fetch & display)
- [x] Authentication system (email/password + Reader token)
- [x] E2E test suite (96% pass rate, 351/364 tests)

### ✅ DevOps Foundation (Phase 0 Immediate Actions)

- [x] Local Supabase setup for dev/test isolation
- [x] Environment separation (dev/test/prod)
- [x] Security headers implementation
- [x] E2E test environment fixes (zero production contamination)

### ✅ Design Prototyping Infrastructure

- [x] Created design revamp plan
- [x] Established design-first workflow
- [x] Built initial prototypes for key screens

---

## Future Enhancements (Post-MVP)

### Reading Features

- Paragraph navigation (jump to prev/next paragraph)
- Bookmark/save position
- Reading statistics and analytics
- Custom reading modes (focus, speed read, etc.)

### LLM Integration

- Article chat with Claude/GPT/Gemini
- Suggested prompts and summaries
- Chat history persistence
- Smart context injection

### History & Ratings

- Reading history with filters
- Post-read rating system
- Quality tracking over time
- Reading insights and trends

### Polish & Optimization

- Performance optimization (code splitting, lazy loading)
- Cross-browser compatibility
- Accessibility audit (WCAG compliance)
- Mobile gesture controls (optional)
- Offline support (optional)

---

## Decision Log

### Key Decisions Made

**2026-01-22: Design-First Workflow Adopted**

- **Decision**: Always prototype designs before implementation
- **Rationale**: Building without prototyping led to poor UX requiring redesign
- **Impact**: Better UX outcomes, less rework, faster iteration

**2026-01-22: DevOps Before Features**

- **Decision**: Complete stable DevOps setup before major UI work
- **Rationale**: Security issues (plaintext tokens, no rate limiting) are critical
- **Impact**: Delays feature work but ensures production readiness

**2026-01-21: Local Supabase for Development**

- **Decision**: Use local Supabase for all dev/test work
- **Rationale**: Complete isolation, zero production risk, 100-1000x faster
- **Impact**: Safer, faster development with better DX

---

## Success Metrics

### Current Metrics (2026-01-22)

- **Test Pass Rate**: 96% (351/364 tests)
- **CI Time**: ~1m18s (within 10% threshold)
- **Test Coverage**: High for core RSVP engine
- **Production Incidents**: 0 (post environment separation)

### Target Metrics (End of Priority 2)

- **Reading Experience Rating**: 4.5/5 stars from user testing
- **RSVP Player Performance**: <50ms render time per word
- **Mobile UX Score**: >90 (Lighthouse mobile)
- **Test Pass Rate**: Maintain 95%+

### Target Metrics (End of Priority 3)

- **Readwise Sync Reliability**: >99% success rate
- **Archive Sync Latency**: <5 seconds
- **API Rate Limit Compliance**: 100% (no throttling)
- **E2E Coverage**: All critical user flows

---

## Related Documentation

- [Project Plan](./PROJECT_PLAN.md) - Comprehensive technical plan
- [Learnings](./LEARNINGS.md) - Accumulated project wisdom
- [Design Revamp Plan](./redesign/DESIGN_REVAMP_PLAN.md) - UI redesign strategy
- [DevOps Next Steps](./devops/NEXT-STEPS-ANALYSIS.md) - Infrastructure priorities
- [Documentation Index](./INDEX.md) - Find any documentation quickly

---

**Maintenance**: Update this roadmap weekly or when priorities shift significantly.
