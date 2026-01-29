/**
 * Test helpers for seeding and managing Readwise sync state in E2E tests.
 *
 * These helpers allow tests to pre-populate the sync state table to control
 * which locations get synced and limit API call budget.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Constants matching src/lib/sync/syncUser.ts
const MAX_REQUESTS_PER_MINUTE = 20;

export interface SyncStateSeedOptions {
  /**
   * User ID to seed sync state for.
   */
  userId: string;

  /**
   * Locations to mark as already synced (will use timestamp cursors).
   * These locations will be skipped during sync.
   * @default ['new', 'feed', 'archive', 'shortlist']
   */
  completedLocations?: Array<'new' | 'later' | 'feed' | 'archive' | 'shortlist'>;

  /**
   * Request budget to leave (how many requests can be made).
   * @default 1
   */
  remainingBudget?: number;

  /**
   * Whether initial backfill should be marked as done.
   * When false (default), sync uses backfill order: new, later, archive, shortlist, feed.
   * When true, all locations sync in a single pass.
   * @default false
   */
  initialBackfillDone?: boolean;
}

/**
 * Creates a Supabase admin client for test operations.
 * Returns null if required env vars are not set.
 */
export function createTestAdminClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Generates an ISO timestamp cursor for a "completed" location.
 * Uses a time slightly in the past to ensure incremental sync fetches new content.
 */
function getTimestampCursor(hoursAgo = 24): string {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

/**
 * Maps location names to their corresponding cursor column names.
 */
const LOCATION_TO_CURSOR: Record<string, string> = {
  new: 'inbox_cursor',
  later: 'library_cursor',
  feed: 'feed_cursor',
  archive: 'archive_cursor',
  shortlist: 'shortlist_cursor',
};

/**
 * Seeds the readwise_sync_state table for a test user.
 *
 * This pre-populates the sync state to:
 * - Skip specified locations by setting their cursors to timestamps
 * - Limit the API call budget to a small number
 * - Allow only specific locations (typically just 'later') to actually sync
 *
 * @example
 * ```ts
 * // Seed state so only 'later' (library) location syncs with 1 API call budget
 * await seedSyncState({
 *   userId: testUser.id,
 *   completedLocations: ['new', 'feed', 'archive', 'shortlist'],
 *   remainingBudget: 1,
 * });
 * ```
 */
export async function seedSyncState(options: SyncStateSeedOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  const {
    userId,
    completedLocations = ['new', 'feed', 'archive', 'shortlist'],
    remainingBudget = 1,
    initialBackfillDone = false,
  } = options;

  const adminClient = createTestAdminClient();
  if (!adminClient) {
    return { success: false, error: 'Supabase env vars not configured' };
  }

  // Build cursor values for completed locations
  const cursors: Record<string, string | null> = {
    inbox_cursor: null,
    library_cursor: null,
    feed_cursor: null,
    archive_cursor: null,
    shortlist_cursor: null,
  };

  for (const location of completedLocations) {
    const cursorColumn = LOCATION_TO_CURSOR[location];
    if (cursorColumn) {
      cursors[cursorColumn] = getTimestampCursor();
    }
  }

  // Calculate window_request_count to leave specified budget
  const windowRequestCount = Math.max(0, MAX_REQUESTS_PER_MINUTE - remainingBudget);

  // Current timestamp for window
  const now = new Date();

  const syncState = {
    user_id: userId,
    ...cursors,
    initial_backfill_done: initialBackfillDone,
    in_progress: false,
    window_started_at: now.toISOString(),
    window_request_count: windowRequestCount,
    next_allowed_at: null, // Allow sync immediately
    last_sync_at: null,
    last_429_at: null,
  };

  const { error } = await adminClient.from('readwise_sync_state').upsert(syncState, {
    onConflict: 'user_id',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Gets the current sync state for a user.
 */
export async function getSyncState(userId: string): Promise<{
  state: Record<string, unknown> | null;
  error?: string;
}> {
  const adminClient = createTestAdminClient();
  if (!adminClient) {
    return { state: null, error: 'Supabase env vars not configured' };
  }

  const { data, error } = await adminClient
    .from('readwise_sync_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return { state: null, error: error.message };
  }

  return { state: data };
}

/**
 * Clears sync state and cached data for a user.
 * Useful for test cleanup.
 */
export async function clearSyncData(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const adminClient = createTestAdminClient();
  if (!adminClient) {
    return { success: false, error: 'Supabase env vars not configured' };
  }

  // Delete in order due to foreign key constraints
  const tables = ['cached_articles', 'cached_documents', 'readwise_sync_state'];

  for (const table of tables) {
    const { error } = await adminClient.from(table).delete().eq('user_id', userId);
    if (error) {
      // Ignore "no rows deleted" errors
      if (!error.message.includes('No rows')) {
        return { success: false, error: `Failed to clear ${table}: ${error.message}` };
      }
    }
  }

  return { success: true };
}

/**
 * Waits for sync to complete by polling the sync state.
 */
export async function waitForSyncComplete(
  userId: string,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<{
  completed: boolean;
  error?: string;
}> {
  const { timeoutMs = 30000, pollIntervalMs = 500 } = options;

  const adminClient = createTestAdminClient();
  if (!adminClient) {
    return { completed: false, error: 'Supabase env vars not configured' };
  }

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const { data, error } = await adminClient
      .from('readwise_sync_state')
      .select('in_progress, last_sync_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { completed: false, error: error.message };
    }

    // Sync is complete when not in progress
    if (data && !data.in_progress) {
      return { completed: true };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return { completed: false, error: 'Timeout waiting for sync to complete' };
}

/**
 * Checks if cached documents exist for a user.
 */
export async function getCachedDocumentCount(userId: string): Promise<{
  count: number;
  error?: string;
}> {
  const adminClient = createTestAdminClient();
  if (!adminClient) {
    return { count: 0, error: 'Supabase env vars not configured' };
  }

  const { count, error } = await adminClient
    .from('cached_documents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0 };
}

/**
 * Checks if cached articles (with HTML content) exist for a user.
 */
export async function getCachedArticleCount(userId: string): Promise<{
  count: number;
  error?: string;
}> {
  const adminClient = createTestAdminClient();
  if (!adminClient) {
    return { count: 0, error: 'Supabase env vars not configured' };
  }

  const { count, error } = await adminClient
    .from('cached_articles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0 };
}
