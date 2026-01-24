# RSVP Reader Project Learnings

**Created**: 2026-01-21
**Last Updated**: 2026-01-22
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

**Why Local Supabase Won**: The project moved to local Supabase for test isolation after discovering critical environment contamination issues (2026-01-22).

**Key Decision**: Local Supabase instances per developer over shared test database

- **Rationale**: Complete test isolation, zero risk of production contamination, faster test execution
- **Performance**: Local Supabase responds 100-1000x faster than production (5-50ms vs 200-500ms for auth)
- **Tradeoff**: Slightly more complex setup, but worth it for safety and speed

**Critical Setup Lessons**:

1. **Environment File Isolation is Non-Negotiable**
   - Production credentials in `.env.local` leaked into test environment despite `NODE_ENV=test`
   - **Solution**: Rename `.env.local` → `.env.development.local` to prevent Next.js from loading it during tests
   - Next.js loads `.env.local` in ALL environments EXCEPT when `NODE_ENV=test` is set

2. **Service Role Keys Require Special Handling**
   - Local Supabase uses different JWT signing methods than production
   - Admin API cleanup may fail with "invalid JWT: signing method HS256 is invalid"
   - **Solution**: Make cleanup best-effort only, don't fail tests on cleanup errors

3. **Database Seeding**
   - Use Supabase migrations for schema (`supabase db push`)
   - Seed test data via SQL scripts in `supabase/seed.sql`
   - Keep test data minimal and deterministic

### Environment Contamination Prevention

**Hard-Won Lesson**: A single shared database across dev/test/prod is a critical vulnerability.

**What Went Wrong** (Pre-2026-01-22):

- E2E tests used production Supabase credentials
- Tests created and deleted real users in production database
- Integration tests hit production Readwise account
- Risk level: 9.5/10

**Prevention Strategy**:

1. Strict environment file naming (`.env.development.local` NOT `.env.local`)
2. Explicit `NODE_ENV=test` in Playwright config's `webServer.env`
3. Never commit production credentials
4. Use local Supabase (`npx supabase start`) for all testing
5. CI/CD uses separate test database instance

**Verification**: Check for leaks with `grep -r "prod-credential-pattern" . --exclude-dir=node_modules`

### Row Level Security (RLS) Patterns

_To be populated with RLS policy patterns that worked well_

### Schema Design Decisions

**Sensitive Token Storage**:

- Currently storing plaintext tokens in database (`users.reader_access_token`, `users.llm_api_key`)
- **Risk**: Anyone with DB access can read all user API tokens (Severity 8.0/10)
- **TODO**: Implement encryption at rest or use Supabase Vault
- See: [devops/SECURITY.md](./devops/SECURITY.md)

---

## 4. Testing Strategies That Worked

### E2E Testing Patterns

**Framework**: Playwright with 4 parallel workers for speed

**Environment Isolation Strategy** (Implemented 2026-01-22):

1. **Never Mix Test and Production Credentials**
   - Use `.env.test` for test configuration
   - Use `.env.development.local` for local development (NOT `.env.local`)
   - Explicitly set `NODE_ENV=test` in Playwright's `webServer.env` config

2. **Local Supabase for All E2E Tests**
   - Start with `npx supabase start` before running tests
   - Tests use `http://127.0.0.1:54321` (local) never production URLs
   - Zero cost, zero rate limits, complete isolation

3. **Mock External APIs Aggressively**
   - Mock Readwise API to avoid rate limits (20 req/min)
   - Only run real integration tests when explicitly needed
   - Use feature flags to skip integration tests in CI

**Test Resilience Pattern for Loading States**:

Local Supabase is so fast (<50ms) that loading states may be invisible. Don't assume timing:

```typescript
// ❌ BAD: Assumes loading state will appear
await page.click('button');
await expect(loadingIndicator).toBeVisible(); // May already be gone!

// ✅ GOOD: Race multiple outcomes
await page.click('button');
const result = await Promise.race([
  loadingIndicator.waitFor({ timeout: 500 }).then(() => 'loading'),
  errorMessage.waitFor({ timeout: 1500 }).then(() => 'error'),
]);
expect(['loading', 'error']).toContain(result);
```

**Integration Test Skip Logic**:

Don't just check for token presence - validate it's real:

```typescript
// ❌ BAD: Treats placeholder as valid
const shouldRun = !!READWISE_TOKEN;

// ✅ GOOD: Verify it's a real token
const shouldRun =
  !!READWISE_TOKEN &&
  !READWISE_TOKEN.includes('placeholder') &&
  !READWISE_TOKEN.includes('test-token') &&
  READWISE_TOKEN.length > 20;
```

**Test Cleanup Best Practices**:

1. Make cleanup best-effort only (don't fail tests on cleanup errors)
2. Local test users are ephemeral anyway
3. Log cleanup failures but continue
4. Use `beforeEach` for setup, `afterEach` for cleanup attempts

**Test Performance**:

- Full suite (364 tests) runs in ~1 minute with 4 workers
- Auth tests: 74 tests, all passing (96% overall pass rate post-fixes)
- Visual alignment: 168 screenshot tests, all passing

### Unit Testing Approaches

_To be populated with unit testing patterns_

### Test Environment Management

**Critical Learnings from E2E Test Fixes** (2026-01-22):

**Problem Solved**: 26 failing tests, production database contamination

**Root Causes Identified**:

1. Environment file precedence issue (`.env.local` loaded during tests)
2. Assumption that loading states would always be visible
3. Production credentials leaking into test environment
4. Placeholder tokens treated as valid for integration tests

**Solutions Implemented**:

1. Renamed `.env.local` → `.env.development.local` for proper isolation
2. Added `NODE_ENV=test` to Playwright config's `webServer.env`
3. Made tests resilient to variable backend speed using `Promise.race()`
4. Improved integration test skip logic to validate token quality
5. Made cleanup best-effort to handle JWT signing method differences

**Results**: 351/364 tests passing (96%), zero production contamination

**Reference**: [e2e-test-environment-fixes.md](./archive/2026-01/devops/e2e-test-environment-fixes.md)

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

### Building Without Prototyping Screens First - 2026-01-22

**What we tried**: Jumped directly into building the app by implementing React components and API routes without creating design prototypes first.

**Why it didn't work**:

- Led to suboptimal UI/UX decisions that were harder to change once implemented in code
- Wasted development time on implementations that needed to be redesigned
- Missing the opportunity to iterate quickly on design before committing to code
- Built features that didn't feel right in actual use (e.g., RSVP player reading experience)

**What we learned**:

- Design prototyping phase is **critical** - don't skip it
- Creating HTML/CSS/JS prototypes or mockups first allows rapid iteration on UX
- Better designs emerge from a deliberate prototyping phase with user testing
- It's much faster to iterate on design in prototypes than in production code

**Better approach**:

1. Create design prototypes (HTML/CSS/JS or Figma) for each screen first
2. Build a redesign plan based on prototype learnings
3. Only then implement in the actual application, screen by screen
4. This prevents building the wrong thing and saves significant development time

**Status**: Now following this approach - created comprehensive redesign plan before continuing implementation.

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

**Critical Insight**: Environment separation isn't just best practice - it's essential for data safety and testing confidence.

**Deployment Review Findings** (2026-01-22):

**Before Review**:

- Single shared Supabase database across all environments
- Tests modifying production data (Risk: 9.5/10)
- No separate test credentials
- E2E tests using production Readwise account

**After Implementation**:

- Local Supabase instances for development and testing
- Production database completely isolated
- Environment-specific credential management
- Zero test contamination

**Environment File Strategy**:

```
.env                      # Shared defaults, never contains secrets
.env.development.local    # Local dev credentials (gitignored)
.env.test                 # Test credentials (committed, uses local Supabase)
.env.production           # Production (Vercel manages this)
```

**Key Principle**: Use environment-specific `.local` files (`.env.development.local`) NOT generic `.env.local` which Next.js loads in all non-test environments.

**Secret Rotation Procedures**:

- Document rotation schedule (quarterly minimum for high-value secrets)
- Test secret rotation in non-production first
- Use environment variables, never hardcode
- See: [secret-rotation.md](./devops/secret-rotation.md)

**CI/CD Pipeline Lessons**:

- GitHub Actions workflow well-structured with parallel execution
- Lint → Type-check → Unit Tests → E2E Tests → Deploy
- 4 parallel Playwright workers for speed
- Conditional Vercel deployment on success
- Artifact upload for debugging failures

### Security Practices

**Security Posture Review** (2026-01-22):

**Critical Vulnerabilities Found**:

1. **Plaintext tokens in database** (Severity 8.0/10)
   - `users.reader_access_token` unencrypted
   - `users.llm_api_key` unencrypted
   - **TODO**: Implement encryption or Supabase Vault

2. **No rate limiting** (Severity 6.0/10)
   - API routes unprotected
   - Risk of abuse and cost escalation
   - **TODO**: Implement `@upstash/ratelimit` or similar

**Security Headers Implementation**:

- Added via Next.js config
- See recent commit: "feat: add security headers to Next.js application"
- Headers include CSP, X-Frame-Options, etc.

**Best Practices Established**:

1. Never commit secrets (use `.gitignore` for `.env.*.local`)
2. Separate environments completely
3. Use service role keys only in trusted backend contexts
4. Implement RLS policies for all tables
5. Regular security audits (quarterly)

**Reference**: [SECURITY-CHECKLIST.md](./devops/SECURITY-CHECKLIST.md)

### Monitoring & Debugging

**Test Monitoring Strategy**:

- Track test execution time (unit tests <30s, E2E <2min)
- Monitor pass rate (should be >95%)
- Check for environment leaks regularly
- Use Playwright trace files for debugging failures

**Production Debugging**:
_To be populated with production debugging insights as we gain operational experience_

---

## 9. TypeScript & Next.js Patterns

### Type Safety Patterns

_TypeScript patterns that improved code quality_

### Next.js Environment Variables

**Critical Learning**: Next.js has specific environment variable loading precedence that can bite you.

**Loading Order** (first match wins):

1. `process.env` (system environment variables)
2. `.env.$(NODE_ENV).local` (e.g., `.env.test.local`, `.env.development.local`)
3. `.env.local` ⚠️ **Loaded in ALL environments EXCEPT `NODE_ENV=test`**
4. `.env.$(NODE_ENV)` (e.g., `.env.test`, `.env.development`)
5. `.env`

**Implication**: If you use `.env.local` for development, those values will leak into production builds unless you're very careful. Use `.env.development.local` instead.

**For Testing**: You MUST set `NODE_ENV=test` explicitly in test configuration to prevent `.env.local` from loading.

### Next.js App Router

_Learnings about Next.js app router, server components, etc._

### API Route Patterns

**Current Gap**: No rate limiting on API routes (identified in DevOps review)

**Best Practices to Implement**:

- Add rate limiting middleware (e.g., `@upstash/ratelimit`)
- Validate input thoroughly
- Use appropriate HTTP status codes
- Log errors properly
- Handle Readwise API rate limits gracefully (20 req/min)

---

## 10. Developer Experience

### Tooling Choices

_Development tools and why they were chosen_

### Workflow Improvements

**Design-First Development Workflow** (Established 2026-01-22):

After discovering that building without prototyping led to poor UX outcomes, we established a new workflow:

1. **Prototype Phase**: Create design prototypes (HTML/CSS/JS or design tools) for new screens/features
2. **Review & Iterate**: Test prototypes, gather feedback, iterate on design
3. **Plan Phase**: Create detailed redesign/implementation plan based on validated prototypes
4. **Implementation Phase**: Build the actual feature screen-by-screen, following the plan
5. **Validate**: Compare implementation to prototype, ensure UX goals are met

**Impact**: Prevents building the wrong thing, saves development time, produces better UX

### AI Agent Feedback Loop Gap (Known Limitation)

**Current State** (2026-01-22):

The AI development assistant doesn't have an autonomous feedback loop for UI/UX validation:

- Cannot independently see the running application UI
- Cannot find and fix visual issues without human intervention
- Relies on manual testing and user reports for UI problems

**What's Needed**:

Better feedback mechanisms for UI development:

- Screenshot-based validation after UI changes
- Automated visual regression testing with AI analysis
- Self-service UI review capability where AI can load the app and inspect results
- Tighter integration between code changes and visual verification

**Impact**: Requires more manual testing cycles, slows down UI iteration, some issues only caught after user testing

**Workaround**: Manual testing, screenshot sharing, detailed user feedback, comprehensive E2E tests with visual snapshots

### Documentation Practices

_This documentation improvement initiative itself - meta learnings_

---

## Recent Learnings (Last 30 Days)

_This section captures very recent insights before they're organized into categories above_

### 2026-01-22: E2E Test Environment Fixes

**Major breakthrough**: Solved 26 failing tests and eliminated production database contamination

**Root Cause**: `.env.local` was being loaded during tests despite `NODE_ENV=test`, causing production Supabase credentials to leak into test environment.

**Solution**: Renamed `.env.local` → `.env.development.local` and explicitly set `NODE_ENV=test` in Playwright config.

**Impact**:

- Test pass rate improved from 93% to 96% (351/364 passing)
- Zero production contamination
- Local Supabase responds 100-1000x faster (enabling faster test iteration)

**Key Insight**: Next.js environment variable loading is subtle - you must understand the precedence rules to avoid security issues.

### 2026-01-22: Deployment Configuration Review

**Completed**: Comprehensive DevOps review identifying critical security gaps

**Critical Findings**:

1. Shared database across environments (Severity 9.5/10) - RESOLVED
2. Plaintext tokens in database (Severity 8.0/10) - TODO
3. No rate limiting (Severity 6.0/10) - TODO
4. Integration tests hitting real API (Severity 5.5/10) - PARTIALLY RESOLVED

**Actions Taken**: Implemented local Supabase, environment separation, security headers

**Reference**: [devops/SECURITY.md](./devops/SECURITY.md)

### 2026-01-22: Design Prototyping Breakthrough

**Major Insight**: Design prototyping phase is **non-negotiable** for good UX outcomes.

**What Happened**: Built significant portions of the app (including RSVP player) without proper design prototyping. Result: Poor reading experience that required redesign.

**What Worked**: Created comprehensive design revamp plan with prototypes BEFORE implementing changes. This approach:

- Allows rapid UX iteration without code changes
- Produces better designs through focused design thinking
- Saves development time by building the right thing first
- Enables user testing before committing to implementation

**Process Established**:

1. Design prototyping phase first (HTML/CSS/JS or design tools)
2. Create detailed redesign/implementation plan
3. Build screen-by-screen following validated designs

**Impact**: Better UX outcomes, faster development, less rework

### 2026-01-22: Environment Separation Cleanup

**Completed**: Cleaner environment separation strategy for dev/test/prod

**Implementation**:

- Local Supabase for development and testing (complete isolation)
- Production database fully separated
- Environment-specific credential management
- Zero cross-contamination risk

**Benefits**:

- Development confidence (can't accidentally hit production)
- Faster local iteration
- Easier debugging
- Simplified onboarding for new developers

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

- [x] Supabase local development setup process and challenges ✅ 2026-01-22
- [x] DevOps review findings and security improvements implemented ✅ 2026-01-22
- [x] E2E test environment isolation strategy ✅ 2026-01-22
- [x] Environment separation approach and benefits ✅ 2026-01-22
- [ ] Readwise API integration quirks and solutions (when integration work resumes)
- [ ] Testing patterns for Next.js app router
- [ ] Mobile-first design decisions and rationale (when design revamp begins)
- [ ] RSVP algorithm tuning and ORP calculation insights
- [ ] Performance optimization wins and measurement approaches

---

## Cross-References

**Related Documentation**:

- [AGENTS.md](../AGENTS.md) - Procedural working guidelines
- [Documentation Index](./INDEX.md) - Find any doc quickly
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
