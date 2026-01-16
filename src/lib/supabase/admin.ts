import { createServerClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Admin client with service role key - bypasses RLS.
 * ONLY use for server-side operations that need elevated privileges.
 * Never expose this to the client.
 */
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for admin client
        },
      },
    }
  );
}
