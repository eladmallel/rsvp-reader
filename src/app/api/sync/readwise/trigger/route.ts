/**
 * Manual Readwise sync trigger endpoint
 * POST /api/sync/readwise/trigger
 *
 * Initiates a sync for the currently authenticated user.
 * Returns immediately - the sync runs asynchronously.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncUser, WINDOW_MS } from '@/lib/sync/syncUser';
import { decrypt } from '@/lib/crypto/encryption';
import type { Database } from '@/lib/supabase/types';

type SyncState = Database['public']['Tables']['readwise_sync_state']['Row'];

// Lock is considered stale after 5 minutes (sync should never take this long)
const STALE_LOCK_MS = 5 * 60 * 1000;

export async function POST() {
  // 1. Authenticate user via session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[SYNC TRIGGER] User:', user?.id);

  if (!user) {
    console.log('[SYNC TRIGGER] No user found - unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get sync state + check if Readwise connected
  const adminSupabase = createAdminClient();
  const { data: state, error: stateError } = await adminSupabase
    .from('readwise_sync_state')
    .select('*, users!inner(reader_access_token, reader_access_token_encrypted)')
    .eq('user_id', user.id)
    .single();

  console.log('[SYNC TRIGGER] Sync state:', state?.user_id, 'Error:', stateError?.message);

  if (stateError || !state) {
    console.error('Failed to fetch sync state:', stateError);
    return NextResponse.json({ error: 'Sync state not found' }, { status: 404 });
  }

  // Type assertion for the joined users relation
  const userRecord = state.users as unknown as {
    reader_access_token: string | null;
    reader_access_token_encrypted: string | null;
  } | null;

  // Decrypt encrypted token if available, otherwise use plaintext (during migration)
  let userToken: string | null = null;
  if (userRecord?.reader_access_token_encrypted) {
    try {
      userToken = decrypt(userRecord.reader_access_token_encrypted);
    } catch (error) {
      console.error('Failed to decrypt reader token:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt Reader token. Please reconnect your account.' },
        { status: 500 }
      );
    }
  } else if (userRecord?.reader_access_token) {
    userToken = userRecord.reader_access_token;
  }

  console.log('[SYNC TRIGGER] Has token:', !!userToken);

  if (!userToken) {
    console.log('[SYNC TRIGGER] No Reader token found');
    return NextResponse.json({ error: 'Readwise not connected' }, { status: 400 });
  }

  const now = new Date();

  // 3. Check if already syncing (but allow if lock is stale)
  if (state.in_progress) {
    const lockAge = state.lock_acquired_at
      ? now.getTime() - new Date(state.lock_acquired_at).getTime()
      : Infinity; // No lock_acquired_at means lock is definitely stale

    if (lockAge < STALE_LOCK_MS) {
      console.log('[SYNC TRIGGER] Sync already in progress (lock age:', lockAge, 'ms)');
      return NextResponse.json({ error: 'Sync already in progress' }, { status: 400 });
    }

    // Lock is stale - force release it before continuing
    console.log('[SYNC TRIGGER] Detected stale lock (age:', lockAge, 'ms) - releasing');
    const { error: releaseError } = await adminSupabase
      .from('readwise_sync_state')
      .update({ in_progress: false, lock_acquired_at: null })
      .eq('user_id', user.id);

    if (releaseError) {
      console.error('[SYNC TRIGGER] Failed to release stale lock:', releaseError);
      return NextResponse.json({ error: 'Failed to release stale lock' }, { status: 500 });
    }
  }

  // 4. Check rate limiting
  if (state.next_allowed_at && new Date(state.next_allowed_at) > now) {
    const waitSeconds = Math.ceil(
      (new Date(state.next_allowed_at).getTime() - now.getTime()) / 1000
    );
    return NextResponse.json(
      {
        error: 'Rate limited',
        nextAllowedAt: state.next_allowed_at,
        waitSeconds,
      },
      { status: 429 }
    );
  }

  // 5. Acquire lock (optimistic locking)
  const nowIso = now.toISOString();
  const { data: locked, error: lockError } = await adminSupabase
    .from('readwise_sync_state')
    .update({ in_progress: true, lock_acquired_at: nowIso })
    .eq('user_id', user.id)
    .eq('in_progress', false)
    .or(`next_allowed_at.is.null,next_allowed_at.lte.${nowIso}`)
    .select()
    .single();

  if (lockError || !locked) {
    console.error('Failed to acquire lock:', lockError);
    return NextResponse.json({ error: 'Failed to start sync - try again' }, { status: 500 });
  }

  // 6. Start sync asynchronously (don't await)
  console.log('[SYNC TRIGGER] Starting async sync for user:', user.id);
  syncUserAsync(user.id, locked, userToken, now, adminSupabase);

  return NextResponse.json({ success: true, jobId: user.id });
}

/**
 * Run sync asynchronously and update state when complete
 */
async function syncUserAsync(
  userId: string,
  state: SyncState,
  userToken: string,
  now: Date,
  supabase: ReturnType<typeof createAdminClient>
) {
  const nowIso = now.toISOString();

  console.log('[SYNC ASYNC] Starting sync for user:', userId);

  try {
    console.log('[SYNC ASYNC] Calling syncUser...');
    const update = await syncUser({
      supabase,
      state,
      userToken,
      now,
    });

    console.log('[SYNC ASYNC] syncUser completed, updating state...');
    const { error: updateError } = await supabase
      .from('readwise_sync_state')
      .update({
        ...update,
        in_progress: false,
        lock_acquired_at: null,
        last_sync_at: nowIso,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[SYNC ASYNC] Failed to update sync state:', updateError);
    } else {
      console.log('[SYNC ASYNC] Sync completed successfully for user:', userId);
    }
  } catch (syncError) {
    console.error('Manual sync failed for user', userId, ':', syncError);

    // Reset in_progress flag and set rate limit
    await supabase
      .from('readwise_sync_state')
      .update({
        in_progress: false,
        lock_acquired_at: null,
        next_allowed_at: new Date(now.getTime() + WINDOW_MS).toISOString(),
      })
      .eq('user_id', userId);
  }
}
