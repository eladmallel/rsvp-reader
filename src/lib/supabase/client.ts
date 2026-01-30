import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Validates that required Supabase environment variables are configured.
 * In Next.js, NEXT_PUBLIC_* vars are inlined at build time in client components.
 */
export function validateSupabaseConfig(): { valid: boolean; error?: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url === '') {
    return { valid: false, error: 'NEXT_PUBLIC_SUPABASE_URL is not configured' };
  }
  if (!key || key === '') {
    return {
      valid: false,
      error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured',
    };
  }
  return { valid: true };
}

export function createClient() {
  const validation = validateSupabaseConfig();
  if (!validation.valid) {
    throw new Error(`Supabase configuration error: ${validation.error}`);
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
