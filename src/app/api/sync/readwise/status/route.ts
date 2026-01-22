/**
 * Readwise sync status endpoint
 * GET /api/sync/readwise/status
 *
 * Returns the current sync state for the authenticated user.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  // Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get sync state
  const adminSupabase = createAdminClient();
  const { data: state, error } = await adminSupabase
    .from('readwise_sync_state')
    .select('in_progress, last_sync_at, next_allowed_at')
    .eq('user_id', user.id)
    .single();

  if (error || !state) {
    console.error('Failed to fetch sync state:', error);
    return NextResponse.json({ error: 'Sync state not found' }, { status: 404 });
  }

  return NextResponse.json({
    inProgress: state.in_progress,
    lastSyncAt: state.last_sync_at,
    nextAllowedAt: state.next_allowed_at,
  });
}
