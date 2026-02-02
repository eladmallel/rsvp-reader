import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Gets the publishable key for Supabase operations.
 *
 * Prefers the new `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_...) format
 * which supports rotation. Falls back to legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 *
 * See: https://github.com/orgs/supabase/discussions/29260
 */
function getPublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Validates that required Supabase environment variables are configured.
 * Server-side validation for API routes and Server Components.
 */
export function validateSupabaseConfig(): { valid: boolean; error?: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getPublishableKey();

  if (!url || url === '') {
    return { valid: false, error: 'NEXT_PUBLIC_SUPABASE_URL is not configured' };
  }
  if (!key || key === '') {
    return {
      valid: false,
      error:
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is not configured',
    };
  }
  return { valid: true };
}

export async function createClient() {
  const validation = validateSupabaseConfig();
  if (!validation.valid) {
    throw new Error(`Supabase configuration error: ${validation.error}`);
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, getPublishableKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
