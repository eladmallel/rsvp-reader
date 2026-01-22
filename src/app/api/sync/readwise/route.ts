import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncUser, WINDOW_MS } from '@/lib/sync/syncUser';
import type { Database } from '@/lib/supabase/types';

type SyncState = Database['public']['Tables']['readwise_sync_state']['Row'];
type SyncStateWithUser = SyncState & { users: { reader_access_token: string | null } | null };

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

  const { data: states, error } = await supabase
    .from('readwise_sync_state')
    .select(
      'user_id, library_cursor, inbox_cursor, feed_cursor, next_allowed_at, last_sync_at, in_progress, initial_backfill_done, window_started_at, window_request_count, last_429_at, users (reader_access_token)'
    )
    .eq('in_progress', false)
    .or(`next_allowed_at.is.null,next_allowed_at.lte.${nowIso}`);

  if (error) {
    console.error('Failed to fetch sync state:', error);
    return NextResponse.json({ error: 'Failed to fetch sync state' }, { status: 500 });
  }

  const results: Array<{ userId: string; status: string }> = [];

  for (const state of (states ?? []) as SyncStateWithUser[]) {
    const userToken = state.users?.reader_access_token;

    if (!userToken) {
      continue;
    }

    const { data: lockedState, error: lockError } = await supabase
      .from('readwise_sync_state')
      .update({ in_progress: true })
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
