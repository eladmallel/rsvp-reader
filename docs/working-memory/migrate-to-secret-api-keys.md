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

## Changes Made

### 1. `src/lib/supabase/admin.ts`

- Added `getSecretKey()` function that prefers `SUPABASE_SECRET_KEY` over `SUPABASE_SERVICE_ROLE_KEY`
- Backward compatible - works with either key format
- Throws clear error if neither key is set

### 2. `.env.example`

- Updated to document new `SUPABASE_SECRET_KEY` as preferred
- Marked `SUPABASE_SERVICE_ROLE_KEY` as deprecated
- Added link to Supabase migration guide

### 3. `.env.test.example`

- Updated to use `SUPABASE_SECRET_KEY`

### 4. `tests/e2e/utils/supabase.ts`

- Updated to prefer `SUPABASE_SECRET_KEY` over `SUPABASE_SERVICE_ROLE_KEY`
- Added `hasSecretKey()` function
- Kept `hasServiceRoleKey()` as deprecated alias

### 5. Scripts (`scripts/*.ts`, `scripts/*.mjs`)

- Updated all scripts to prefer `SUPABASE_SECRET_KEY`
- Backward compatible with legacy `SUPABASE_SERVICE_ROLE_KEY`

### 6. `playwright.config.ts`

- Added `SUPABASE_SECRET_KEY` to env passthrough

## Migration Steps for Users

1. Generate new secret key in Supabase Dashboard:
   `https://supabase.com/dashboard/project/_/settings/api-keys/new`

2. Add to `.env.local`:

   ```
   SUPABASE_SECRET_KEY=sb_secret_...
   ```

3. Deploy and verify everything works

4. (Optional) Remove old `SUPABASE_SERVICE_ROLE_KEY` from environment

## Key Differences to Note

From the Supabase announcement:

- Secret keys **cannot be used in browsers** (will fail with 401)
- Realtime connections last 24h without signed-in user
- Edge Functions with `--no-verify-jwt` need adjustment
- Cannot use secret key in `Authorization` header (use `apikey` header only)
