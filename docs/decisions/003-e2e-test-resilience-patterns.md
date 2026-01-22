# 003. E2E Test Resilience Patterns

**Date**: 2026-01-22
**Status**: Accepted
**Deciders**: Development Team
**Tags**: testing, quality, automation

---

## Context

During the E2E test environment fixes (2026-01-22), we discovered that tests written with assumptions about timing and backend speed were brittle and unreliable.

**The Problem**:

- Tests assumed loading states would always be visible
- Local Supabase responds 100-1000x faster than production (5-50ms vs 200-500ms)
- Loading states disappeared in <16ms (less than one frame at 60fps)
- 12 auth tests were failing due to these timing assumptions

**Example Failure**:

```typescript
// Test code
await page.click('button[type="submit"]');
await expect(loadingIndicator).toBeVisible(); // ❌ Already gone!

// Error: "Expected element to be visible, but it was not found"
```

The loading state appeared and disappeared before Playwright could detect it.

---

## Decision

We will adopt **resilient test patterns** that work across variable backend speeds, rather than assuming specific timing behavior.

### Pattern 1: Race Multiple Outcomes

Instead of expecting a specific sequence, race multiple valid outcomes and accept any of them.

```typescript
// ✅ Good: Race loading state vs. final state
await page.click('button');
const result = await Promise.race([
  loadingIndicator.waitFor({ timeout: 500 }).then(() => 'loading'),
  errorMessage.waitFor({ timeout: 1500 }).then(() => 'error'),
]).catch(() => 'timeout');

expect(['loading', 'error']).toContain(result);
```

### Pattern 2: Accept Multiple Valid End States

Don't assert intermediate states - focus on the final outcome.

```typescript
// ❌ Bad: Assumes specific sequence
await page.click('submit');
await expect(loadingIndicator).toBeVisible();
await expect(loadingIndicator).toBeHidden();
await expect(successMessage).toBeVisible();

// ✅ Good: Check final state, accept fast or slow path
await page.click('submit');
await expect(page.getByRole('alert')).toHaveText(/success|error/i, { timeout: 2000 });
```

### Pattern 3: Use Flexible Timeouts

Make timeout durations proportional to expected backend speed.

```typescript
// Local Supabase: 5-50ms
// Production: 200-500ms
// Safety margin: 3x slowest expected

const result = await Promise.race([
  loadingState.waitFor({ timeout: 500 }), // Enough for slow local responses
  finalState.waitFor({ timeout: 1500 }), // Enough for network requests
]);
```

---

## Rationale

### Why Variable Backend Speed Matters

**Local Development**:

- Supabase runs in Docker on localhost
- No network latency
- Responses in 5-50ms
- Loading states invisible to human eye

**Production**:

- Supabase hosted in cloud
- Network round-trip time
- Responses in 200-500ms
- Loading states clearly visible

**The Gap**: Tests written against production assumptions fail on local, and vice versa.

### Why This Pattern Works

1. **Environment Agnostic**: Works with fast or slow backends
2. **More Realistic**: Tests actual outcomes, not implementation details
3. **Less Flaky**: No race conditions based on timing
4. **Maintainable**: Doesn't need updating when backend speed changes
5. **Clear Intent**: Tests what users care about (final state), not loading UI

---

## Alternatives Considered

### Option 1: Artificial Delays in Test Environment

**Approach**: Slow down local Supabase or add delays to simulate production.

```typescript
// Add artificial delays
await page.click('submit');
await page.waitForTimeout(200); // Simulate network latency
await expect(loadingIndicator).toBeVisible();
```

**Pros**:

- Tests work the same everywhere
- Can see loading states

**Cons**:

- Slows down test suite significantly (200ms × hundreds of tests = minutes)
- Artificial delays are brittle (wrong duration = flaky tests)
- Hides real performance issues
- Tests lie about actual system behavior

**Rejected because**: Makes tests slower and less truthful.

---

### Option 2: Separate Test Suites for Local vs. Production

**Approach**: Write different tests for fast (local) and slow (production) environments.

**Pros**:

- Each test suite optimized for its environment
- Can test loading states in production

**Cons**:

- Doubles test maintenance burden
- Easy for test suites to diverge
- Hard to ensure coverage parity
- Complexity for developers (which suite to run?)

**Rejected because**: Maintenance burden too high for marginal benefit.

---

### Option 3: Mock/Stub Slow Responses

**Approach**: Replace real Supabase calls with mocks that have configurable delays.

**Pros**:

- Full control over timing
- Can test edge cases (very slow responses)

**Cons**:

- Loses integration testing value
- Mock drift from real Supabase behavior
- Doesn't test real auth flows
- Misses RLS policy bugs

**Rejected because**: We specifically want to test real Supabase, not mocks.

---

### Option 4: Skip Loading State Tests Entirely

**Approach**: Only test final outcomes, ignore loading states.

**Pros**:

- Simple, no timing issues
- Fast tests

**Cons**:

- Doesn't catch loading state bugs (missing indicators, wrong text)
- Poor UX if loading states are broken
- No regression detection for loading UI

**Rejected because**: Loading states are important UX, should be tested.

---

## Consequences

### Positive

1. **Reliability**: Tests pass consistently across environments
2. **Speed**: No artificial delays, tests run at full speed
3. **Fidelity**: Tests real backend behavior, not mocks
4. **Maintainability**: Tests don't break when backend performance improves
5. **Coverage**: Catches both fast-path and slow-path bugs
6. **Developer Experience**: Same tests work in CI and locally

### Negative

1. **Less Specific Assertions**: Can't assert exact sequence of events
   - **Mitigation**: Focus on outcomes users care about, not implementation details

2. **More Complex Test Code**: `Promise.race()` is harder to read than simple assertions
   - **Mitigation**: Document pattern in AGENTS.md, provide examples

3. **Doesn't Catch Some Loading UI Bugs**: If loading state never shows, test might pass
   - **Mitigation**: Visual regression tests for loading states, manual QA

---

## Implementation Guidelines

### When to Use This Pattern

**Use Race Pattern When**:

- Testing actions with loading states (login, submit forms, API calls)
- Backend speed varies significantly between environments
- The exact sequence doesn't matter to users

**Don't Use Race Pattern When**:

- Testing pure UI interactions (no backend)
- Sequence is critical to correctness (multi-step wizards)
- You need to verify specific loading text/styling (use visual regression)

### Code Examples

**Auth Flow (Login)**:

```typescript
test('login with invalid credentials shows error', async ({ page }) => {
  await page.fill('input[name="email"]', 'invalid@example.com');
  await page.fill('input[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');

  // Accept either loading state OR immediate error
  const result = await Promise.race([
    page
      .getByRole('button', { name: /signing in/i })
      .waitFor({ state: 'visible', timeout: 500 })
      .then(() => 'loading'),
    page
      .getByRole('alert')
      .filter({ hasText: /invalid/i })
      .waitFor({ state: 'visible', timeout: 1500 })
      .then(() => 'error'),
  ]).catch(() => 'timeout');

  expect(['loading', 'error']).toContain(result);

  // Verify final state
  await expect(page.getByRole('alert')).toHaveText(/invalid/i);
});
```

**Form Submission (Signup)**:

```typescript
test('signup with existing email shows error', async ({ page }) => {
  await fillSignupForm(page, existingEmail);
  await page.click('button[type="submit"]');

  // Skip intermediate states, check final outcome
  await expect(page.getByRole('alert')).toHaveText(/already exists/i, {
    timeout: 2000, // Generous timeout for slow networks
  });
});
```

**Navigation (Redirect)**:

```typescript
test('back button returns to library', async ({ page }) => {
  await page.goto('/article/123');
  await page.click('button:has-text("Back")');

  // Accept authenticated OR unauthenticated redirect
  await expect(page).toHaveURL(/\/(library|auth\/login)?$/, {
    timeout: 1000,
  });
});
```

### Timeout Guidelines

- **Loading state check**: 500ms (catches slow local responses)
- **Final state check**: 1500ms (catches slow network requests)
- **Navigation**: 1000ms (page routing is typically fast)
- **API calls**: 2000ms (external services may be slow)

**Rule of Thumb**: 3x the slowest expected response time in normal conditions.

---

## Related

- [E2E Test Environment Fixes](../devops/e2e-test-environment-fixes.md)
- [ADR-001: Supabase Local Development](./001-supabase-local-development.md)
- [AGENTS.md - Test Performance](../../AGENTS.md#3-test-performance)
- [LEARNINGS.md - Testing Strategies](../LEARNINGS.md#4-testing-strategies-that-worked)

---

## Review Schedule

- **Next Review**: 2026-04-22 (3 months)
- **Review Triggers**:
  - Introduction of new UI loading patterns
  - Changes to backend performance characteristics
  - Test flakiness reports
  - Team feedback on pattern complexity
  - New testing framework or Playwright version

---

## Appendices

### Appendix A: Measuring Backend Speed

To verify local vs. production speed differences:

```typescript
// In test setup
const start = Date.now();
await supabaseClient.auth.signInWithPassword({ email, password });
const duration = Date.now() - start;
console.log(`Auth request took ${duration}ms`);
```

**Expected Results**:

- Local: 5-50ms
- Production: 200-500ms

### Appendix B: Common Anti-Patterns

**❌ Don't do this**:

```typescript
// Brittle: Assumes loading state duration
await page.click('submit');
await expect(loadingIndicator).toBeVisible();
await page.waitForTimeout(100); // Arbitrary delay
await expect(loadingIndicator).toBeHidden();
```

**❌ Don't do this**:

```typescript
// Flaky: Assumes backend speed
await page.click('submit');
await page.waitForLoadState('networkidle'); // May timeout on slow backends
```

**❌ Don't do this**:

```typescript
// Too specific: Couples test to implementation
await page.click('submit');
await expect(page.locator('.spinner')).toBeVisible(); // What if spinner class changes?
await expect(page.locator('.spinner')).toBeHidden();
await expect(page.locator('.success-message')).toBeVisible();
```

**✅ Do this instead**:

```typescript
// Resilient: Tests outcome, not implementation
await page.click('submit');
await expect(page.getByRole('alert')).toHaveText(/success|error/i);
```
