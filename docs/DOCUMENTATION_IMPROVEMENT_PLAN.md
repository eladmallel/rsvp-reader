# RSVP Reader Documentation Improvement Plan

**Created**: 2026-01-21
**Status**: Active
**Priority**: Phase 1 (Foundation)

## User Preferences

Based on discussion on 2026-01-21:

- **Learnings location**: Separate `LEARNINGS.md` file (keep AGENTS.md procedural)
- **PROJECT_PLAN.md**: Split into focused documents
- **Implementation priority**: Phase 1 (Foundation) first
- **Documentation cadence**: Daily 5-minute updates
- **Visual assets**: Centralized in `/docs/assets/`

---

## Executive Summary

### Current Strengths

- Excellent AGENTS.md with comprehensive working guidelines
- Strong testing culture embedded in documentation
- Well-documented recent DevOps work
- Good foundations for knowledge management

### Critical Gaps

1. No centralized learnings/knowledge base
2. Missing documentation index (hard to discover what exists)
3. Visual assets scattered without organization
4. No cross-references between documents
5. No architecture decision records (ADRs)
6. PROJECT_PLAN.md too large (806 lines)
7. Unclear which sync plan is current

---

## Top 10 Improvements (Prioritized)

### 🔴 Critical - Phase 1 (Foundation)

#### 1. Create Documentation Index (`/docs/INDEX.md`)

**Effort**: 2 hours
**Impact**: Reduce discovery time from minutes to seconds

Create single entry point to all documentation with clear categorization.

**Structure**:

```markdown
# RSVP Reader Documentation Index

## Quick Start

- README.md
- NEXT_STEPS_AFTER_RESTART.md

## Project Management

- PROJECT_PLAN.md
- OPEN_QUESTIONS.md
- AGENTS.md

## Architecture & Design

- Design Revamp Plan
- Implementation Plan

## DevOps & Operations

- Deployment Review Summary
- Security Checklist
- Secret Rotation

## Feature Planning

- Readwise Sync Plan
- Manual Readwise Sync Plan

## Troubleshooting

- Sync Troubleshooting

## Working Memory

- Reading Position Persistence
- Readwise Sync Reliability

## Visual Assets

- (catalog with descriptions)

## Decisions (ADRs)

- (architecture decision records)
```

---

#### 2. Create LEARNINGS.md File

**Effort**: 3 hours initial, 5 min/day maintenance
**Impact**: Single source of truth for accumulated wisdom

Separate from AGENTS.md to keep procedures clean while capturing project-specific insights.

**Structure**:

```markdown
# RSVP Reader Project Learnings

## 1. RSVP Algorithm Insights

- [ORP calculation, timing algorithms]

## 2. Readwise API Patterns

- [API behavior, rate limits, pagination quirks]

## 3. Supabase & Database Patterns

- [RLS insights, migration strategies, local dev setup lessons]

## 4. Testing Strategies That Worked

- [E2E patterns, mocking strategies]

## 5. UI/UX Discoveries

- [Mobile-first insights, RTL handling, theme switching]

## 6. Things That Didn't Work (And Why)

- [Failed approaches - critical for avoiding repetition]

## 7. Performance Optimizations

- [Specific wins and how they were achieved]

## 8. Deployment & DevOps Lessons

- [Environment separation, secret management, CI/CD]
```

**Daily capture**: Spend 5 minutes at end of day adding learnings.

---

#### 3. Set Up Directory Structure

**Effort**: 1 hour
**Impact**: Organized foundation for all improvements

Create:

```
docs/
├── assets/
│   ├── screenshots/
│   │   ├── ui-reference/
│   │   ├── design-mockups/
│   │   └── README.md (catalog)
│   ├── designs/
│   │   └── README.md
│   └── diagrams/
├── decisions/ (ADRs)
│   └── 000-template.md
├── archive/
│   └── 2026-01/ (YYYY-MM folders)
└── working-memory/
    └── _TEMPLATE.md
```

---

#### 4. Create Documentation Templates

**Effort**: 1 hour
**Impact**: Consistent, high-quality documentation

**Templates to create**:

**A. `/docs/working-memory/_TEMPLATE.md`**:

```markdown
# Working Memory: [Task Name]

**Created**: YYYY-MM-DD
**Status**: In Progress | Blocked | Complete
**Related Docs**: [Links]

## Objective

[What you're trying to accomplish]

## Current Status

[Where you are now]

## Key Context

- [Important facts]

## Decisions Made

| Decision | Rationale | Date |
| -------- | --------- | ---- |

## Next Steps

1. [ ] Step 1

## Blockers

- [Any blockers]

## Notes & Discoveries

[Insights and learnings]

## Archive Note (when complete)

[Outcome summary, links to commits/PRs]
```

**B. `/docs/decisions/000-template.md`** (ADR template):

```markdown
# [Number]. [Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated
**Deciders**: [Names/roles]
**Tags**: [architecture, security, ux, performance]

## Context

[Issue being addressed]

## Decision

[What we decided]

## Rationale

[Why this option]

## Alternatives Considered

1. **Option A**: [description]
   - Pros: [...]
   - Cons: [...]

## Consequences

**Positive**:

- [Good outcomes]

**Negative**:

- [Tradeoffs]

## Related

- [Links to related decisions/docs]
```

---

#### 5. Create DOCUMENTATION_GUIDE.md

**Effort**: 1 hour
**Impact**: Standards for maintaining quality

**Key sections**:

- When to create documentation
- Metadata requirements (created, updated, status)
- Naming conventions
- Review schedule (daily, weekly, monthly, quarterly)
- Archiving process

---

### 🟡 High Impact - Phase 2 (Organization)

#### 6. Reorganize Visual Assets

**Effort**: 2 hours
**Impact**: Visual references become usable and discoverable

1. Move images to `/docs/assets/screenshots/`
2. Organize by category (ui-reference, design-mockups)
3. Create `/docs/assets/screenshots/README.md` catalog:
   - Image purpose
   - Creation date
   - Related documentation links

---

#### 7. Add Cross-Reference Network

**Effort**: 2 hours
**Impact**: Information surfaces naturally

Add "Related Documentation" sections to all major docs:

**In AGENTS.md**:

```markdown
## See Also

- [Documentation Index](./docs/INDEX.md)
- [Learnings](./docs/LEARNINGS.md)
- [Design Revamp Plan](./docs/redesign/DESIGN_REVAMP_PLAN.md)
- [Deployment Review](./docs/devops/DEPLOYMENT-REVIEW-SUMMARY.md)
```

**In PROJECT_PLAN.md**:

```markdown
## Related Documentation

- [AGENTS.md](../AGENTS.md) - Working guidelines
- [LEARNINGS.md](./LEARNINGS.md) - Project insights
- [Design Revamp Plan](./redesign/DESIGN_REVAMP_PLAN.md)
- [Sync Troubleshooting](./SYNC_TROUBLESHOOTING.md)
```

---

#### 8. Consolidate Sync Documentation

**Effort**: 2 hours
**Impact**: Eliminates confusion about current strategy

Create `/docs/sync/README.md`:

- Clarify current sync architecture
- Link to alternative plans as historical reference
- Document why current approach was chosen

---

#### 9. Process OPEN_QUESTIONS.md

**Effort**: 1 hour
**Impact**: Active questions stay visible, resolved ones become wisdom

1. Move resolved questions to LEARNINGS.md
2. Archive outdated questions
3. Update active questions with current context

---

### 🟢 Enhancement - Phase 3

#### 10. Split PROJECT_PLAN.md

**Effort**: 3 hours
**Impact**: Easier to maintain, find info, reduce merge conflicts

**Split into**:

```
docs/
├── PROJECT_PLAN.md (overview + task breakdown)
├── specification/
│   ├── product-spec.md
│   └── feature-requirements.md
├── design/
│   └── design-system.md
└── architecture/
    ├── systems-design.md
    └── testing-strategy.md
```

Keep PROJECT_PLAN.md as:

- Quick links to split docs
- Current phase info
- Task breakdown (active work tracker)
- Recent updates (changelog)

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Focus**: Create infrastructure for better documentation

**Tasks**:

1. ✅ Create directory structure (1 hour)
2. ✅ Create templates (1 hour)
3. ✅ Create INDEX.md (2 hours)
4. ✅ Create DOCUMENTATION_GUIDE.md (1 hour)
5. ✅ Create initial LEARNINGS.md structure (1 hour)

**Deliverable**: Documentation infrastructure ready to use
**Total time**: ~6 hours

---

### Phase 2: Organization (Week 2)

**Focus**: Organize existing content

**Tasks**:

1. ✅ Reorganize visual assets (2 hours)
2. ✅ Add cross-references to all major docs (2 hours)
3. ✅ Process OPEN_QUESTIONS.md (1 hour)
4. ✅ Consolidate sync documentation (2 hours)

**Deliverable**: All existing docs organized and cross-referenced
**Total time**: ~7 hours

---

### Phase 3: Enhancement (Week 3)

**Focus**: Add knowledge and capture learnings

**Tasks**:

1. ✅ Populate LEARNINGS.md with initial insights (3 hours)
   - Deployment review findings
   - Supabase local dev setup
   - Readwise API quirks
   - Testing patterns
2. ✅ Create initial ADRs (4 hours)
   - ADR-001: Supabase local development
   - ADR-002: Background sync architecture
   - ADR-003: Mobile-first design approach
   - ADR-004: Environment separation strategy
3. ✅ Split PROJECT_PLAN.md (3 hours)

**Deliverable**: Enhanced knowledge base with decision records
**Total time**: ~10 hours

---

### Phase 4: Maintenance (Ongoing)

**Focus**: Keep documentation fresh

**Daily** (5 minutes):

- Add learnings to LEARNINGS.md
- Update working-memory files for active tasks

**Weekly** (15 minutes):

- Update INDEX.md for new documents
- Review and update ADRs if needed

**Monthly** (30 minutes):

- Review PROJECT_PLAN.md task status
- Archive completed working-memory files
- Update "Last Updated" dates

**Quarterly** (2 hours):

- Full documentation audit
- Archive stale documents
- Improve cross-references
- Review all ADRs

---

## Quick Wins (Can Start Today - 30 minutes)

These have immediate impact:

1. **Create `/docs/INDEX.md`** cataloging all current docs (15 min)
2. **Add metadata** (created, updated, status) to top 5 docs (10 min)
3. **Move 2-3 resolved questions** from OPEN_QUESTIONS.md to a "Resolved" section (5 min)

---

## Success Metrics

### Quantitative

- **Discovery time**: Find any doc in < 60 seconds
- **Cross-reference coverage**: Every major doc links to 3+ related docs
- **Staleness**: No doc over 90 days without review
- **Completeness**: Zero "TODO" sections older than 30 days

### Qualitative

- **Onboarding**: New developer can understand project from docs alone
- **Decision transparency**: Why behind every major decision is documented
- **Learning retention**: Same mistakes not repeated
- **Discoverability**: Related information surfaces naturally

---

## Initial Learnings to Capture

Based on recent work, prioritize capturing these in LEARNINGS.md:

### Supabase Local Dev Setup

- Why local Supabase over shared test DB
- Setup challenges and solutions
- Migration strategy
- RLS patterns that worked

### DevOps & Security

- Deployment review key findings
- Secret management approach
- Environment separation strategy
- Security headers implementation

### Readwise API

- Rate limiting behavior
- Pagination patterns
- API quirks discovered
- Error handling strategies

### Testing Patterns

- E2E test setup
- Mocking strategies
- Test data management
- What worked vs what didn't

---

## Architecture Decision Records to Create

Priority ADRs based on major decisions made:

1. **ADR-001: Supabase Local Development Environment**
   - Context: Need isolated test environment
   - Decision: Local Supabase vs shared DB
   - Rationale: Test isolation, data safety

2. **ADR-002: Readwise Background Sync Architecture**
   - Context: Keep library in sync with Readwise
   - Decision: Background sync vs real-time
   - Rationale: API rate limits, offline support

3. **ADR-003: Mobile-First Design Approach**
   - Context: Design revamp for better UX
   - Decision: Mobile-first vs desktop-first
   - Rationale: Primary use case, constraints

4. **ADR-004: Environment Separation Strategy**
   - Context: Prevent test data in production
   - Decision: Strict separation approach
   - Rationale: Data safety, testing confidence

---

## Documentation Debt Identified

### High Priority

1. ⚠️ No learnings captured from Supabase local dev setup
2. ⚠️ DevOps review findings not integrated into knowledge base
3. ⚠️ Multiple sync plans with unclear current state
4. ⚠️ Working memory pattern underutilized

### Medium Priority

1. Screenshots lack context and organization
2. No ADRs despite major decisions made
3. NEXT_STEPS_AFTER_RESTART.md may be stale
4. PROJECT_PLAN.md too large (806 lines)

### Low Priority

1. Cross-references sparse
2. Some docs lack metadata
3. No contribution guide

---

## Total Effort Estimate

- **Phase 1**: ~6 hours (Foundation)
- **Phase 2**: ~7 hours (Organization)
- **Phase 3**: ~10 hours (Enhancement)
- **Ongoing**: 5 min/day + periodic reviews

**Total**: ~23 hours over 3 weeks + daily maintenance

---

## Next Steps

1. **Today**: Run quick wins (30 min)
2. **This week**: Complete Phase 1 (6 hours)
3. **Week 2**: Complete Phase 2 (7 hours)
4. **Week 3**: Complete Phase 3 (10 hours)
5. **Daily**: 5-minute learning capture at end of day

---

## Questions Resolved

1. ✅ **Learnings location**: Separate LEARNINGS.md file
2. ✅ **PROJECT_PLAN split**: Yes, split into focused docs
3. ✅ **Priority**: Phase 1 (Foundation) first
4. ✅ **Cadence**: Daily 5-minute updates
5. ✅ **Visual assets**: Centralized `/docs/assets/`

---

**Ready to implement Phase 1!**
