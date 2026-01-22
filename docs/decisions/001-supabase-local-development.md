# 001. Supabase Local Development Environment

**Date**: 2026-01-22
**Status**: Accepted
**Deciders**: Development Team
**Tags**: infrastructure, testing, security

---

## Context

Prior to January 2026, the RSVP Reader project used a single shared Supabase database instance across all environments (development, testing, and production). This created several critical issues:

1. **Data Safety**: E2E tests created and deleted test users in the production database
2. **Security Risk**: Test code had access to production credentials and data
3. **Test Reliability**: Tests were affected by production data state and changes
4. **Compliance**: Mixing test and production data violates best practices
5. **Cost**: Unnecessary API calls to production Supabase during testing

The deployment review (2026-01-22) rated this as a **9.5/10 severity** risk requiring immediate remediation.

---

## Decision

We will use **local Supabase instances** for development and testing, completely separating them from production.

**Implementation**:

- Developers run `npx supabase start` locally for development
- E2E tests use local Supabase (`http://127.0.0.1:54321`)
- Production uses hosted Supabase (separate instance)
- CI/CD can use either local Supabase or a dedicated test instance

---

## Rationale

### Why Local Supabase Wins

**vs. Shared Test Database**:

- Local: Zero contamination risk, complete isolation
- Shared: Still risks cross-developer interference, requires coordination

**vs. Production Database**:

- Local: Zero risk to production data
- Production: Catastrophic risk (data loss, corruption, security breach)

**vs. Docker Compose Custom Setup**:

- Local: Official Supabase CLI, automatic updates, well-supported
- Custom: More maintenance, potential drift from production environment

### Additional Benefits

1. **Performance**: Local Supabase responds 100-1000x faster than production
   - Production auth: 200-500ms
   - Local auth: 5-50ms
   - Full E2E suite runs in ~1 minute instead of 10+

2. **Cost**: Zero cost for development and testing (no hosted database usage)

3. **Offline Development**: Can develop and test without internet connection

4. **Safety**: Impossible to accidentally corrupt production data during testing

5. **Consistency**: Every developer has identical local environment

---

## Alternatives Considered

### Option 1: Shared Hosted Test Database

**Pros**:

- Closer to production environment
- Shared state for integration testing
- No local setup required

**Cons**:

- Still risks data contamination between developers
- Requires coordination for schema changes
- Costs money for hosting
- Slower than local (network latency)
- Can't test offline

**Rejected because**: Doesn't solve the fundamental isolation problem, and local Supabase provides better dev experience.

---

### Option 2: Continue Using Production Database

**Pros**:

- No additional setup
- Tests use real production environment

**Cons**:

- **CRITICAL**: Can corrupt production data
- **CRITICAL**: Security breach if test credentials leak
- Tests unreliable (affected by production state)
- Violates compliance requirements
- No safety net for destructive operations

**Rejected because**: Unacceptable risk level (9.5/10 severity).

---

### Option 3: In-Memory Mock Database

**Pros**:

- Fastest possible tests
- Zero dependencies
- Perfect isolation

**Cons**:

- Doesn't test real database behavior
- Mock drift from real Supabase
- Miss RLS policy testing
- Miss migration testing
- High maintenance (keep mocks in sync)

**Rejected because**: Sacrifices too much test fidelity. We need to test real Supabase behavior, especially RLS policies.

---

## Consequences

### Positive

1. **Safety**: Zero risk of production data contamination
2. **Speed**: Tests run 10x faster with local Supabase
3. **Confidence**: Can test destructive operations safely
4. **Cost**: Eliminates test-related production database costs
5. **Developer Experience**: Faster feedback loop, offline development
6. **Security**: Test credentials completely isolated from production

### Negative

1. **Setup Complexity**: Developers must run `npx supabase start` before testing
   - **Mitigation**: Documented in README, test scripts check for running instance

2. **Environment Parity**: Local Supabase might differ from production
   - **Mitigation**: Use same Supabase version, regular updates, schema migrations

3. **Disk Space**: Local PostgreSQL database requires ~200MB
   - **Mitigation**: Acceptable overhead for modern development machines

4. **Initial Learning Curve**: Team must learn Supabase CLI commands
   - **Mitigation**: Simple commands (`start`, `stop`, `reset`), well-documented

---

## Implementation Notes

### Environment File Structure

```
.env                      # Shared defaults, no secrets
.env.development.local    # Local dev credentials (gitignored)
.env.test                 # Test credentials (committed, local Supabase)
.env.production           # Production (managed by Vercel)
```

### Key Configuration

**Playwright Config** (`playwright.config.ts`):

```typescript
webServer: {
  env: {
    NODE_ENV: 'test', // Critical: prevents .env.local from loading
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '<local-anon-key>',
    SUPABASE_SERVICE_ROLE_KEY: '<local-service-role-key>',
  },
}
```

### Verification

Check for environment leaks:

```bash
# Should only match .env.development.local, never .env.test
grep -r "production-credential-pattern" . --exclude-dir=node_modules
```

---

## Related

- [ADR-002: Environment Separation Strategy](./002-environment-separation-strategy.md)
- [ADR-003: E2E Test Environment Isolation](./003-e2e-test-environment-isolation.md)
- [E2E Test Environment Fixes](../devops/e2e-test-environment-fixes.md)
- [Deployment Review Summary](../devops/DEPLOYMENT-REVIEW-SUMMARY.md)
- [LEARNINGS.md - Supabase & Database Patterns](../LEARNINGS.md#3-supabase--database-patterns)

---

## Review Schedule

- **Next Review**: 2026-04-22 (3 months)
- **Review Triggers**:
  - Supabase major version updates
  - Team feedback on setup complexity
  - Discovery of environment parity issues
  - Changes to CI/CD requirements
