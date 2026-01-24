import { cache } from 'react';
import { createClient } from './server';
import type { User } from '@supabase/supabase-js';

/**
 * Cached wrapper for getting the current authenticated user.
 * Deduplicates multiple getUser() calls within the same request cycle.
 *
 * @example
 * const { data: { user }, error } = await getCachedUser();
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});

/**
 * Cached wrapper for getting a specific cached document by ID.
 * Deduplicates multiple queries for the same document within the same request cycle.
 *
 * @param id - The document ID to fetch
 * @param includeContent - Whether to include the full HTML content
 *
 * @example
 * const { data: document, error } = await getCachedDocument('doc-123', true);
 */
export const getCachedDocument = cache(async (id: string, includeContent = false) => {
  const supabase = await createClient();

  const query = supabase
    .from('cached_documents')
    .select(
      includeContent
        ? '*'
        : 'id, title, author, source, created_at, updated_at, location, tags, word_count, reading_progress_percent, last_opened_at'
    )
    .eq('id', id)
    .single();

  return query;
});

/**
 * Cached wrapper for checking if a user exists.
 * Returns just the user object for convenience.
 *
 * @returns The authenticated user or null if not authenticated
 *
 * @example
 * const user = await getAuthenticatedUser();
 * if (!user) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 */
export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  const {
    data: { user },
  } = await getCachedUser();
  return user;
});
