# Working Memory: Migrate to Supabase Secret API Keys

## Status: ✅ COMPLETED

## Background

Per [Supabase Discussion #29260](https://github.com/orgs/supabase/discussions/29260):

Supabase is introducing new API key types:

| Type        | Format               | Privileges              | Use                         |
| ----------- | -------------------- | ----------------------- | --------------------------- |
| Publishable | `sb_publishable_...` | Low (respects RLS)      | Replaces `anon` key         |
| Secret      | `sb_secret_...`      | Elevated (bypasses RLS) | Replaces `service_role` key |

### Why migrate?

The old `service_role` JWT **cannot be rotated** without downtime because:

- It's tightly coupled to the JWT secret
- Rotating the JWT secret affects all JWTs (including user auth tokens)
- No rollback capability

The new `sb_secret_...` keys:

- Can be rotated independently with zero downtime
- Can be instantly revoked
- Can have multiple secret keys simultaneously (for gradual rotation)
- Have audit logging when revealed/used

### Timeline

- **June 2025**: Early preview (opt-in)
- **November 2025**: Reminders begin, restored projects won't have legacy keys
- **Late 2026**: Legacy keys removed entirely

## Changes Made (2 commits)

### Commit 1: Core Implementation

- `src/lib/supabase/admin.ts` - Added `getSecretKey()` that prefers `SUPABASE_SECRET_KEY`
- `.env.example` - Documented new key format, marked legacy as deprecated
- `.env.test.example` - Updated to use new key
- `tests/e2e/utils/supabase.ts` - Support both key formats
- Scripts (`*.ts`, `*.mjs`) - Support both key formats
- `playwright.config.ts` - Pass through both key formats

### Commit 2: Documentation Updates

- `README.md` - Updated environment variable tables and troubleshooting
- `.env.test` - Changed to use `SUPABASE_SECRET_KEY`
- `docs/decisions/001-supabase-local-development.md` - Added note about new keys
- `docs/decisions/002-environment-separation-strategy.md` - Added note about new keys
- `docs/2026-01-28-e2e-auth-test-fixes.md` - Updated key references
- `tests/e2e/helpers/sync-state.ts` - Support both key formats
- `tests/e2e/integration-real-data.spec.ts` - Updated docs
- `scripts/check-latest-docs.mjs` - Support both key formats

## Verification

- ✅ All 478 unit tests pass
- ✅ 73 E2E auth tests pass (1 skipped)
- ✅ Lint passes (0 errors, 2 unrelated warnings)

## Migration Steps for Users

1. Generate new secret key in Supabase Dashboard:
   `https://supabase.com/dashboard/project/_/settings/api-keys/new`

2. Add to `.env.local` or `.env.development.local`:

   ```
   SUPABASE_SECRET_KEY=sb_secret_...
   ```

3. Deploy and verify everything works

4. (Optional) Remove old `SUPABASE_SERVICE_ROLE_KEY` from environment

## Backward Compatibility

The implementation is **fully backward compatible**:

- If `SUPABASE_SECRET_KEY` is set, it's used
- If only `SUPABASE_SERVICE_ROLE_KEY` is set, it's used as fallback
- If neither is set, a clear error is thrown

## Key Differences to Note

From the Supabase announcement:

- Secret keys **cannot be used in browsers** (will fail with 401)
- Realtime connections last 24h without signed-in user
- Edge Functions with `--no-verify-jwt` need adjustment
- Cannot use secret key in `Authorization` header (use `apikey` header only)
