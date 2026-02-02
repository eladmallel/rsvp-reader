import { createServerClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Gets the secret key for admin/elevated operations.
 *
 * Prefers the new `SUPABASE_SECRET_KEY` (sb_secret_...) format which supports
 * rotation without downtime. Falls back to legacy `SUPABASE_SERVICE_ROLE_KEY`
 * for backward compatibility during migration.
 *
 * See: https://github.com/orgs/supabase/discussions/29260
 */
function getSecretKey(): string {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (secretKey) {
    return secretKey;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    // TODO: Add deprecation warning once migration is complete
    // console.warn('SUPABASE_SERVICE_ROLE_KEY is deprecated. Use SUPABASE_SECRET_KEY instead.');
    return serviceRoleKey;
  }

  throw new Error(
    'Missing Supabase secret key. Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY.'
  );
}

/**
 * Admin client with secret key - bypasses RLS.
 *
 * Uses the new Supabase secret key format (sb_secret_...) when available,
 * which supports independent rotation without downtime.
 *
 * ONLY use for server-side operations that need elevated privileges:
 * - Cron jobs iterating over all users
 * - Database migrations and maintenance scripts
 * - E2E test setup/teardown
 *
 * Never expose to the client.
 */
export function createAdminClient() {
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, getSecretKey(), {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op for admin client
      },
    },
  });
}
