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
import type { Database } from '@/lib/supabase/types';

type SyncState = Database['public']['Tables']['readwise_sync_state']['Row'];

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
    .select('*, users!inner(reader_access_token)')
    .eq('user_id', user.id)
    .single();

  console.log('[SYNC TRIGGER] Sync state:', state?.user_id, 'Error:', stateError?.message);

  if (stateError || !state) {
    console.error('Failed to fetch sync state:', stateError);
    return NextResponse.json({ error: 'Sync state not found' }, { status: 404 });
  }

  // Type assertion for the joined users relation
  const userRecord = state.users as unknown as { reader_access_token: string | null } | null;
  const userToken = userRecord?.reader_access_token;

  console.log('[SYNC TRIGGER] Has token:', !!userToken);

  if (!userToken) {
    console.log('[SYNC TRIGGER] No Reader token found');
    return NextResponse.json({ error: 'Readwise not connected' }, { status: 400 });
  }

  // 3. Check if already syncing
  if (state.in_progress) {
    console.log('[SYNC TRIGGER] Sync already in progress');
    return NextResponse.json({ error: 'Sync already in progress' }, { status: 400 });
  }

  // 4. Check rate limiting
  const now = new Date();
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
    .update({ in_progress: true })
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
        next_allowed_at: new Date(now.getTime() + WINDOW_MS).toISOString(),
      })
      .eq('user_id', userId);
  }
}
