import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncUser, WINDOW_MS } from '@/lib/sync/syncUser';
import { decrypt } from '@/lib/crypto/encryption';
import type { Database } from '@/lib/supabase/types';

type SyncState = Database['public']['Tables']['readwise_sync_state']['Row'];
type SyncStateWithUser = SyncState & {
  users: {
    reader_access_token: string | null;
    reader_access_token_encrypted: string | null;
  } | null;
};

// Lock is considered stale after 5 minutes (sync should never take this long)
const STALE_LOCK_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.SYNC_API_KEY;
  const token =
    request.nextUrl.searchParams.get('token') ?? request.headers.get('x-readwise-sync-secret');

  if (!secret) {
    return NextResponse.json({ error: 'SYNC_API_KEY is not configured' }, { status: 500 });
  }

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // Calculate stale lock threshold
  const staleLockThreshold = new Date(now.getTime() - STALE_LOCK_MS).toISOString();

  // Query for:
  // 1. Not in progress AND (no rate limit OR rate limit expired)
  // 2. OR in_progress with stale lock (lock_acquired_at is null or older than threshold)
  const { data: states, error } = await supabase
    .from('readwise_sync_state')
    .select(
      'user_id, library_cursor, inbox_cursor, feed_cursor, next_allowed_at, last_sync_at, in_progress, initial_backfill_done, window_started_at, window_request_count, last_429_at, lock_acquired_at, users (reader_access_token, reader_access_token_encrypted)'
    )
    .or(
      `and(in_progress.eq.false,or(next_allowed_at.is.null,next_allowed_at.lte.${nowIso})),and(in_progress.eq.true,or(lock_acquired_at.is.null,lock_acquired_at.lte.${staleLockThreshold}))`
    );

  if (error) {
    console.error('Failed to fetch sync state:', error);
    return NextResponse.json({ error: 'Failed to fetch sync state' }, { status: 500 });
  }

  const results: Array<{ userId: string; status: string }> = [];

  for (const state of (states ?? []) as SyncStateWithUser[]) {
    // Decrypt encrypted token if available, otherwise use plaintext (during migration)
    let userToken: string | null = null;
    if (state.users?.reader_access_token_encrypted) {
      try {
        userToken = decrypt(state.users.reader_access_token_encrypted);
      } catch (error) {
        console.error('Failed to decrypt reader token:', error);
        continue;
      }
    } else if (state.users?.reader_access_token) {
      userToken = state.users.reader_access_token;
    }

    if (!userToken) {
      continue;
    }

    // For stale locks, we need to reset them first
    if (state.in_progress) {
      console.log('[SYNC] Releasing stale lock for user:', state.user_id);
      await supabase
        .from('readwise_sync_state')
        .update({ in_progress: false, lock_acquired_at: null })
        .eq('user_id', state.user_id);
    }

    const { data: lockedState, error: lockError } = await supabase
      .from('readwise_sync_state')
      .update({ in_progress: true, lock_acquired_at: nowIso })
      .eq('user_id', state.user_id)
      .eq('in_progress', false)
      .or(`next_allowed_at.is.null,next_allowed_at.lte.${nowIso}`)
      .select()
      .single();

    if (lockError || !lockedState) {
      continue;
    }

    try {
      const update = await syncUser({
        supabase,
        state: lockedState,
        userToken,
        now,
      });

      const { error: updateError } = await supabase
        .from('readwise_sync_state')
        .update({
          ...update,
          in_progress: false,
          lock_acquired_at: null,
          last_sync_at: nowIso,
        })
        .eq('user_id', lockedState.user_id);

      if (updateError) {
        console.error('Failed to update sync state:', updateError);
        results.push({ userId: lockedState.user_id, status: 'update_failed' });
      } else {
        results.push({ userId: lockedState.user_id, status: 'ok' });
      }
    } catch (syncError) {
      console.error('Readwise sync failed:', syncError);

      const { error: resetError } = await supabase
        .from('readwise_sync_state')
        .update({
          in_progress: false,
          lock_acquired_at: null,
          next_allowed_at: new Date(now.getTime() + WINDOW_MS).toISOString(),
        })
        .eq('user_id', lockedState.user_id);

      if (resetError) {
        console.error('Failed to reset sync state:', resetError);
      }

      results.push({ userId: lockedState.user_id, status: 'sync_failed' });
    }
  }

  return NextResponse.json({ ok: true, results });
}
