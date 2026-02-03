# 005. Defer SWR Migration for Data Fetching

**Date**: 2026-02-02
**Status**: Accepted
**Deciders**: AI Agent, Human Developer
**Tags**: architecture, performance, dependencies

## Context

A detailed migration plan existed (`docs/SWR-MIGRATION-PLAN.md`) to replace manual `useEffect` + `fetch` patterns with the SWR library across three pages:

- Library page (~416 lines) - 3 data sources + sync polling
- Feed page (~333 lines) - 2 data sources + client-side filtering
- Settings page (~673 lines) - 2 data sources + 3 mutations

The plan promised:

- Automatic request deduplication
- Built-in caching for instant page revisits
- Cleaner code (~100-150 lines removed)
- Built-in stale-while-revalidate pattern

The React Best Practices Audit (item 4.1) had marked this as "Pending" with "High effort, High impact."

## Decision

**Defer the SWR migration indefinitely.** Archive the migration plan without executing it.

## Rationale

After re-evaluating the plan against the current state of the codebase:

1. **AbortController cleanup is already implemented** - The audit shows all three pages now have proper request cancellation. This eliminates one of SWR's key benefits.

2. **The existing code works well** - Tests pass, the patterns are explicit and debuggable. The manual approach, while verbose, is battle-tested in this codebase.

3. **Marginal ROI for significant effort:**
   - ~40-50 lines saved per file doesn't justify 4-phase migration with verification gates
   - SWR adds 13KB to the bundle
   - Risk of regressions during migration

4. **Caching benefits are questionable for this app:**
   - A reading app often wants fresh data (newly synced articles)
   - Users may not navigate back frequently enough to benefit from cache
   - Manual refetch on tab switch is the current (correct) behavior

5. **Added cognitive overhead:**
   - Team must learn SWR patterns (`mutate`, `revalidate`, `dedupingInterval`)
   - Debugging SWR caching issues can be non-obvious
   - Another dependency to maintain and update

6. **Existing optimizations are sufficient:**
   - React Compiler is enabled (automatic memoization)
   - Dynamic imports for heavy components
   - Parallel fetches where beneficial
   - Proper AbortController cleanup

## Alternatives Considered

1. **Execute the SWR migration as planned**
   - Pros: Cleaner code, built-in caching, industry-standard pattern
   - Cons: Significant effort, bundle size increase, learning curve, risk of regressions

2. **Create a lightweight custom `useFetch` hook**
   - Pros: Standardizes existing pattern without new dependency
   - Cons: Still requires migration work, reinventing the wheel

3. **Do nothing (chosen)**
   - Pros: Zero effort, zero risk, existing code is solid
   - Cons: Misses potential code cleanup opportunity

## Consequences

**Positive**:

- No migration effort or risk
- No new dependency to maintain
- Bundle size stays smaller (no +13KB)
- Team continues with familiar patterns
- Focus can remain on feature work

**Negative**:

- Manual `useEffect` + `fetch` patterns remain verbose
- No automatic caching across page navigations
- If app complexity grows significantly, may need to revisit

## Implementation Notes

1. Moved `docs/SWR-MIGRATION-PLAN.md` → `docs/archive/2026-01/SWR-MIGRATION-PLAN.md`
2. Updated `docs/REACT-BEST-PRACTICES-AUDIT.md` item 4.1 status to "⏸️ Deferred"
3. If a concrete pain point emerges (performance issues, feature complexity), this decision can be revisited

## Related

- [Archived SWR Migration Plan](../archive/2026-01/SWR-MIGRATION-PLAN.md)
- [React Best Practices Audit](../REACT-BEST-PRACTICES-AUDIT.md) - Item 4.1
