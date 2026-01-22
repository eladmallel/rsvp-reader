# RSVP Reader Project Learnings

**Created**: 2026-01-21
**Last Updated**: 2026-01-21
**Purpose**: Accumulated wisdom and insights from building RSVP Reader
**Maintenance**: Daily 5-minute updates at end of day

---

## How to Use This Document

This is the project's knowledge base - a living document capturing lessons learned, patterns that work, and mistakes to avoid. Unlike AGENTS.md (which contains procedural guidelines), this captures project-specific insights.

**Daily practice**: Spend 5 minutes at end of day adding learnings:

- What worked well today?
- What didn't work (and why)?
- What surprised you?
- What would you do differently next time?

---

## Table of Contents

1. [RSVP Algorithm Insights](#1-rsvp-algorithm-insights)
2. [Readwise API Patterns](#2-readwise-api-patterns)
3. [Supabase & Database Patterns](#3-supabase--database-patterns)
4. [Testing Strategies That Worked](#4-testing-strategies-that-worked)
5. [UI/UX Discoveries](#5-uiux-discoveries)
6. [Things That Didn't Work (And Why)](#6-things-that-didnt-work-and-why)
7. [Performance Optimizations](#7-performance-optimizations)
8. [Deployment & DevOps Lessons](#8-deployment--devops-lessons)
9. [TypeScript & Next.js Patterns](#9-typescript--nextjs-patterns)
10. [Developer Experience](#10-developer-experience)

---

## 1. RSVP Algorithm Insights

### Optimal Recognition Point (ORP) Calculation

_To be populated with learnings about ORP timing, word grouping, reading speed calculations_

### Reading Experience Patterns

_To be populated with insights about what makes RSVP reading effective_

---

## 2. Readwise API Patterns

### API Behavior & Quirks

_Learnings about Readwise API behavior, rate limits, pagination patterns_

**Example structure**:

- **Rate limiting**: [Observations about rate limit behavior]
- **Pagination**: [How pagination works, edge cases discovered]
- **Error handling**: [Common errors and how to handle them]

### Integration Lessons

_To be populated with sync strategy insights_

---

## 3. Supabase & Database Patterns

### Local Development Setup

_Learnings from setting up local Supabase environment_

**Key insights to capture**:

- Why local Supabase over shared test DB (see ADR-001 when created)
- Setup challenges encountered and solutions
- Migration strategy that worked
- Database seeding approach

### Row Level Security (RLS) Patterns

_To be populated with RLS policy patterns that worked well_

### Schema Design Decisions

_Learnings about database schema choices_

---

## 4. Testing Strategies That Worked

### E2E Testing Patterns

_Insights from Playwright/Cypress E2E test setup_

**Key lessons to capture**:

- Environment isolation strategies
- Test data management approaches
- Mocking vs real API calls
- What to test vs what to skip

### Unit Testing Approaches

_To be populated with unit testing patterns_

### Test Environment Management

_Recent learnings from E2E test environment fixes_

**Placeholder for insights like**:

- Environment contamination prevention
- Test database isolation
- Secret management in tests

---

## 5. UI/UX Discoveries

### Mobile-First Design

_Learnings from mobile-first design approach (see ADR-003 when created)_

### Theme Switching

_Insights about dark mode and theme management_

### Reading Experience

_User feedback and observations about RSVP reading UX_

### RTL (Right-to-Left) Support

_Learnings about supporting RTL languages if applicable_

---

## 6. Things That Didn't Work (And Why)

> This section is critical - documenting failures prevents repeating mistakes.

### Failed Approaches

_Document attempts that didn't work out_

**Format**:

```markdown
### [Approach Name] - [Date]

**What we tried**: [Description]
**Why it didn't work**: [Root cause]
**What we learned**: [Insight gained]
**Better approach**: [What worked instead]
```

### Abandoned Features

_Features started but discontinued, and why_

---

## 7. Performance Optimizations

### Successful Optimizations

_Specific performance improvements and their impact_

**Example structure**:

- **Optimization**: [What was optimized]
- **Before**: [Metrics before]
- **After**: [Metrics after]
- **How**: [Implementation approach]

### Performance Anti-Patterns

_Performance mistakes discovered and corrected_

---

## 8. Deployment & DevOps Lessons

### Environment Separation

_Learnings from strict dev/test/prod separation_

**Recent insights** (from deployment review):

- Environment variable management
- Secret rotation procedures
- Database separation strategies
- CI/CD pipeline lessons

### Security Practices

_Security lessons learned_

**To populate with**:

- Security headers implementation insights
- Secret management learnings
- Vulnerability remediation experiences

### Monitoring & Debugging

_Production debugging insights_

---

## 9. TypeScript & Next.js Patterns

### Type Safety Patterns

_TypeScript patterns that improved code quality_

### Next.js App Router

_Learnings about Next.js app router, server components, etc._

### API Route Patterns

_Best practices for Next.js API routes_

---

## 10. Developer Experience

### Tooling Choices

_Development tools and why they were chosen_

### Workflow Improvements

_Process improvements that increased productivity_

### Documentation Practices

_This documentation improvement initiative itself - meta learnings_

---

## Recent Learnings (Last 30 Days)

_This section captures very recent insights before they're organized into categories above_

### 2026-01-21: Documentation Infrastructure

- Created comprehensive documentation system with INDEX.md as central catalog
- Established working-memory pattern for tracking active work
- Set up ADR (Architecture Decision Record) system for capturing major decisions
- Learned that 5-minute daily documentation updates prevent knowledge loss

### [Date]: [Learning]

_Add new learnings here daily, then move to appropriate sections above weekly_

---

## Learnings to Capture (TODO)

Based on recent work, priority insights to document:

- [ ] Supabase local development setup process and challenges
- [ ] DevOps review findings and security improvements implemented
- [ ] Readwise API integration quirks and solutions
- [ ] E2E test environment isolation strategy
- [ ] Testing patterns for Next.js app router
- [ ] Mobile-first design decisions and rationale
- [ ] Environment separation approach and benefits

---

## Cross-References

**Related Documentation**:

- [AGENTS.md](../AGENTS.md) - Procedural working guidelines
- [Documentation Guide](./DOCUMENTATION_GUIDE.md) - How to maintain docs
- [Architecture Decisions](./decisions/) - ADRs for major decisions
- [Project Plan](./PROJECT_PLAN.md) - Current work and roadmap

**When to Add to This Document**:

- Daily: 5-minute reflection at end of day
- After solving tough problems
- When discovering tool/API quirks
- After completing significant features
- When changing your mind about an approach

---

**Maintenance Schedule**:

- **Daily**: Add new learnings to "Recent Learnings" section
- **Weekly**: Organize recent learnings into appropriate categories
- **Monthly**: Review and consolidate related learnings
- **Quarterly**: Archive outdated learnings, update cross-references

---

_This document grows with the project. The more we capture here, the faster we work and the fewer mistakes we repeat._
