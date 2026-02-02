/**
 * Test helpers for seeding and managing Readwise sync state in E2E tests.
 *
 * These helpers allow tests to pre-populate the sync state table to control
 * which locations get synced and limit API call budget.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer new secret key format, fall back to legacy service_role key
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SYNC_API_KEY = process.env.SYNC_API_KEY;

// Constants matching src/lib/sync/syncUser.ts
const MAX_REQUESTS_PER_MINUTE = 20;

// Encryption constants matching src/lib/crypto/encryption.ts
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_SALT = 'rsvp-reader-salt';

/**
 * Encrypts a value using the same algorithm as the main app.
 * This is duplicated here to avoid import path issues with E2E test bundling.
 */
function encryptToken(plaintext: string): string {
  const keyEnv = process.env.ENCRYPTION_KEY;
  if (!keyEnv) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  const baseKey = Buffer.from(keyEnv, 'base64');
  const key = crypto.pbkdf2Sync(baseKey, PBKDF2_SALT, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}

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
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
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

export interface CreateTestUserOptions {
  /**
   * Email for the test user.
   */
  email: string;

  /**
   * Password for the test user.
   */
  password: string;

  /**
   * Readwise access token to store (will be encrypted).
   */
  readwiseToken: string;
}

export interface TestUser {
  id: string;
  email: string;
}

/**
 * Creates a test user in Supabase auth and the users table.
 * Sets up the user with an encrypted Readwise token ready for sync.
 */
export async function createTestUser(options: CreateTestUserOptions): Promise<{
  user: TestUser | null;
  error?: string;
}> {
  const { email, password, readwiseToken } = options;

  const adminClient = createTestAdminClient();
  if (!adminClient) {
    return { user: null, error: 'Supabase env vars not configured' };
  }

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email verification for tests
  });

  if (authError || !authData.user) {
    return { user: null, error: authError?.message ?? 'Failed to create auth user' };
  }

  const userId = authData.user.id;

  // Encrypt the Readwise token
  let encryptedToken: string;
  try {
    encryptedToken = encryptToken(readwiseToken);
  } catch (err) {
    // Clean up auth user on encryption failure
    await adminClient.auth.admin.deleteUser(userId);
    return { user: null, error: err instanceof Error ? err.message : 'Encryption failed' };
  }

  // Create users table entry with encrypted token
  const { error: userError } = await adminClient.from('users').insert({
    id: userId,
    email,
    reader_access_token_encrypted: encryptedToken,
  });

  if (userError) {
    // Clean up auth user on database failure
    await adminClient.auth.admin.deleteUser(userId);
    return { user: null, error: userError.message };
  }

  return { user: { id: userId, email } };
}

/**
 * Deletes a test user and all associated data.
 */
export async function deleteTestUser(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const adminClient = createTestAdminClient();
  if (!adminClient) {
    return { success: false, error: 'Supabase env vars not configured' };
  }

  // Clear sync data first (foreign key constraints)
  const clearResult = await clearSyncData(userId);
  if (!clearResult.success) {
    console.warn('Warning: Failed to clear sync data:', clearResult.error);
  }

  // Delete from users table (will cascade to other tables)
  const { error: userError } = await adminClient.from('users').delete().eq('id', userId);

  if (userError) {
    console.warn('Warning: Failed to delete from users table:', userError.message);
  }

  // Delete auth user
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

  if (authError) {
    return { success: false, error: authError.message };
  }

  return { success: true };
}

/**
 * Triggers the Readwise sync for all eligible users via the cron endpoint.
 * Returns the sync results.
 */
export async function triggerSync(baseUrl: string): Promise<{
  success: boolean;
  results?: Array<{ userId: string; status: string }>;
  error?: string;
}> {
  if (!SYNC_API_KEY) {
    return { success: false, error: 'SYNC_API_KEY environment variable not set' };
  }

  try {
    const response = await fetch(`${baseUrl}/api/sync/readwise?token=${SYNC_API_KEY}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Sync endpoint returned ${response.status}: ${text}` };
    }

    const data = await response.json();
    return { success: true, results: data.results };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Fetch failed' };
  }
}

/**
 * Complete setup for a test user with sync state seeded and ready to sync.
 * This is a convenience function that combines user creation and state seeding.
 */
export async function setupTestUserForSync(options: {
  email: string;
  password: string;
  readwiseToken: string;
  remainingBudget?: number;
  completedLocations?: Array<'new' | 'later' | 'feed' | 'archive' | 'shortlist'>;
}): Promise<{
  user: TestUser | null;
  error?: string;
}> {
  const {
    email,
    password,
    readwiseToken,
    remainingBudget = 1,
    completedLocations = ['new', 'feed', 'archive', 'shortlist'],
  } = options;

  // Create the user
  const userResult = await createTestUser({ email, password, readwiseToken });
  if (!userResult.user) {
    return { user: null, error: userResult.error };
  }

  // Seed the sync state
  const seedResult = await seedSyncState({
    userId: userResult.user.id,
    completedLocations,
    remainingBudget,
    initialBackfillDone: false,
  });

  if (!seedResult.success) {
    // Clean up user on seed failure
    await deleteTestUser(userResult.user.id);
    return { user: null, error: seedResult.error };
  }

  return { user: userResult.user };
}

/**
 * Waits for cached data to be available after sync.
 * Polls for both cached_documents and cached_articles to have rows.
 */
export async function waitForCachedData(
  userId: string,
  options: { timeoutMs?: number; pollIntervalMs?: number; minDocuments?: number } = {}
): Promise<{
  success: boolean;
  documentCount?: number;
  articleCount?: number;
  error?: string;
}> {
  const { timeoutMs = 30000, pollIntervalMs = 500, minDocuments = 1 } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const docResult = await getCachedDocumentCount(userId);
    const articleResult = await getCachedArticleCount(userId);

    if (docResult.error || articleResult.error) {
      return {
        success: false,
        error: docResult.error || articleResult.error,
      };
    }

    if (docResult.count >= minDocuments && articleResult.count >= minDocuments) {
      return {
        success: true,
        documentCount: docResult.count,
        articleCount: articleResult.count,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Final check to report actual counts
  const finalDocs = await getCachedDocumentCount(userId);
  const finalArticles = await getCachedArticleCount(userId);

  return {
    success: false,
    documentCount: finalDocs.count,
    articleCount: finalArticles.count,
    error: `Timeout: only ${finalDocs.count} documents and ${finalArticles.count} articles cached (expected at least ${minDocuments})`,
  };
}
