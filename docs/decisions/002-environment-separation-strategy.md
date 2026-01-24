# 002. Environment Separation Strategy

**Date**: 2026-01-22
**Status**: Accepted
**Deciders**: Development Team
**Tags**: security, devops, infrastructure

---

## Context

The RSVP Reader application handles sensitive user data including:

- Readwise API tokens (third-party service access)
- LLM API keys (OpenAI, Anthropic, Google)
- User authentication credentials
- Reading history and preferences

Prior to the deployment review (2026-01-22), environment management was insufficient:

1. **Credential Leakage**: Production credentials leaked into test environment via `.env.local`
2. **No Separation**: Single database used across dev, test, and production
3. **Security Risk**: Test code had access to production data and credentials
4. **Compliance Gap**: No clear boundary between environments

The deployment review identified this as a **critical vulnerability** requiring immediate remediation.

---

## Decision

We will implement **strict environment separation** with the following strategy:

### Environment Definitions

1. **Development** (`NODE_ENV=development`)
   - Local Supabase instance
   - Local development server
   - Credentials in `.env.development.local` (gitignored)

2. **Test** (`NODE_ENV=test`)
   - Local Supabase instance
   - Automated test execution
   - Credentials in `.env.test` (committed, safe to share)

3. **Production** (`NODE_ENV=production`)
   - Hosted Supabase instance
   - Vercel deployment
   - Credentials in Vercel environment variables (encrypted)

### Environment File Naming Convention

```
.env                      # Shared defaults, PUBLIC values only, no secrets
.env.development.local    # Development credentials (gitignored)
.env.test                 # Test credentials (committed, local Supabase)
.env.production           # Production (managed by Vercel, not in repo)
```

**Critical Rule**: NEVER use `.env.local` - it loads in all non-test environments and causes credential leakage.

---

## Rationale

### Why Strict Separation Matters

**Security**:

- Test code cannot access production data
- Credential exposure limited to appropriate environment
- Accidental destructive operations contained

**Reliability**:

- Tests run in isolated environment (predictable state)
- Development experimentation doesn't affect production
- Changes can be tested safely before deployment

**Compliance**:

- Clear audit trail of environment access
- Separation of duties (test vs production)
- Data privacy requirements met

**Operational Safety**:

- Impossible to accidentally modify production during testing
- Failed tests don't corrupt production data
- Rollback is safe and predictable

---

## Alternatives Considered

### Option 1: Shared Environment with Runtime Checks

**Approach**: Use same database but add runtime checks to prevent destructive operations in production.

**Pros**:

- Simple setup
- Single database to manage

**Cons**:

- Relies on perfect code (one missed check = disaster)
- Tests still dependent on production state
- No safety net for bugs in runtime checks
- Violates "defense in depth" principle

**Rejected because**: Too risky. One code bug could corrupt production.

---

### Option 2: Feature Flags for Environment Behavior

**Approach**: Use feature flags to change behavior based on environment.

**Pros**:

- Flexible environment configuration
- Can test production-like behavior in staging

**Cons**:

- Complexity (flag state management)
- Easy to misconfigure flags
- Doesn't solve credential separation
- Still risks production contamination if flag logic is wrong

**Rejected because**: Adds complexity without solving the core problem.

---

### Option 3: Namespace-Based Separation in Single Database

**Approach**: Use table prefixes or schemas to separate environments in one database.

**Pros**:

- Single database connection
- Easier management (one instance)

**Cons**:

- **CRITICAL**: One misconfigured query can still access production
- Doesn't isolate credentials
- Performance impact (larger database)
- Complex RLS policies needed
- Migration risks (wrong namespace)

**Rejected because**: Insufficient isolation, too error-prone.

---

## Consequences

### Positive

1. **Security**: Zero-trust environment isolation prevents credential leakage
2. **Safety**: Impossible to accidentally corrupt production during dev/test
3. **Confidence**: Can test destructive operations without fear
4. **Compliance**: Clear separation meets regulatory requirements
5. **Debugging**: Easy to identify environment-specific issues
6. **Onboarding**: New developers can't accidentally affect production

### Negative

1. **Setup Complexity**: Multiple environment files to manage
   - **Mitigation**: Clear documentation, templates, verification scripts

2. **Credential Management**: Must manage separate credentials per environment
   - **Mitigation**: Use password manager, document rotation process

3. **Configuration Drift**: Environments might diverge over time
   - **Mitigation**: Infrastructure as code, regular audits, automated checks

4. **Learning Curve**: Team must understand Next.js env loading rules
   - **Mitigation**: Documented in LEARNINGS.md, enforced by linting

---

## Implementation Details

### Next.js Environment Variable Precedence

Next.js loads environment files in this order (first match wins):

1. `process.env` (system environment variables)
2. `.env.$(NODE_ENV).local` (e.g., `.env.development.local`)
3. `.env.local` ⚠️ **Loaded in ALL environments EXCEPT `NODE_ENV=test`**
4. `.env.$(NODE_ENV)` (e.g., `.env.test`)
5. `.env`

**Critical Insight**: Using `.env.local` for development credentials causes them to load in production builds. Use `.env.development.local` instead.

### Environment Variable Naming

**Public** (exposed to browser):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Private** (server-only):

```
SUPABASE_SERVICE_ROLE_KEY
READWISE_ACCESS_TOKEN  # For testing only
DATABASE_URL           # Future use
```

### Verification Commands

**Check for production credential leaks**:

```bash
# Should only match .env.development.local, never .env.test
grep -r "production-specific-value" . --exclude-dir=node_modules
```

**Verify test environment isolation**:

```bash
# Run tests and check they use local Supabase
npm run test:e2e 2>&1 | grep "127.0.0.1:54321"
```

### Deployment Checklist

Before deploying to production:

- [ ] Verify `.env.local` does not exist in repo
- [ ] Confirm `.env.development.local` is gitignored
- [ ] Check Vercel environment variables are set
- [ ] Run E2E tests to verify test environment isolation
- [ ] Rotate production secrets if any were exposed

---

## Security Considerations

### Secrets in Git

**NEVER commit**:

- `.env.development.local` (production credentials)
- `.env.production` (production secrets)
- Any file with real API tokens

**Safe to commit**:

- `.env.test` (local Supabase demo keys)
- `.env` (public defaults only)

### Credential Rotation

When production credentials are compromised:

1. Immediately rotate in Supabase/Readwise/LLM provider
2. Update Vercel environment variables
3. Verify old credentials no longer work
4. Document incident in security log

See: [secret-rotation.md](../devops/secret-rotation.md)

---

## Related

- [ADR-001: Supabase Local Development](./001-supabase-local-development.md)
- [ADR-003: E2E Test Environment Isolation](./003-e2e-test-environment-isolation.md)
- [Deployment Review Summary](../archive/2026-01/devops/DEPLOYMENT-REVIEW-SUMMARY.md)
- [Security Checklist](../devops/SECURITY-CHECKLIST.md)
- [LEARNINGS.md - Deployment & DevOps](../LEARNINGS.md#8-deployment--devops-lessons)

---

## Review Schedule

- **Next Review**: 2026-04-22 (3 months)
- **Review Triggers**:
  - Security incident or near-miss
  - Changes to deployment platform
  - Team feedback on complexity
  - New environment needed (staging, preview, etc.)
  - Compliance requirements change
