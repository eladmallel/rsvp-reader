/**
 * TEMPORARY DEBUG ENDPOINT - DELETE AFTER DEBUGGING
 * Returns sync state for debugging purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.SYNC_API_KEY;
  const token =
    request.nextUrl.searchParams.get('token') ?? request.headers.get('x-readwise-sync-secret');

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get sync state
  const { data: syncStates, error: syncError } = await supabase
    .from('readwise_sync_state')
    .select(
      'user_id, inbox_cursor, library_cursor, feed_cursor, archive_cursor, shortlist_cursor, initial_backfill_done, window_request_count, last_sync_at'
    );

  // Also get all users to check for mismatches
  const { data: allUsers } = await supabase.from('users').select('id, email');

  if (syncError) {
    return NextResponse.json({ error: 'Failed to fetch sync state' }, { status: 500 });
  }

  // Get document counts per location
  const { data: documents, error: docsError } = await supabase
    .from('cached_documents')
    .select('user_id, location');

  if (docsError) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }

  // Aggregate counts
  const counts: Record<string, Record<string, number>> = {};
  for (const doc of documents || []) {
    const userId = doc.user_id;
    const location = doc.location || 'unknown';
    if (!counts[userId]) counts[userId] = {};
    counts[userId][location] = (counts[userId][location] || 0) + 1;
  }

  // Helper to get cursor status
  const getCursorStatus = (cursor: string | null) => {
    if (!cursor) return 'NOT_STARTED';
    if (cursor.startsWith('page:')) return 'IN_PROGRESS';
    return 'COMPLETE';
  };

  // Format response
  const result = (syncStates || []).map((state) => ({
    userId: state.user_id,
    backfillDone: state.initial_backfill_done,
    lastSyncAt: state.last_sync_at,
    cursors: {
      inbox: getCursorStatus(state.inbox_cursor),
      library: getCursorStatus(state.library_cursor),
      archive: getCursorStatus(state.archive_cursor),
      shortlist: getCursorStatus(state.shortlist_cursor),
      feed: getCursorStatus(state.feed_cursor),
    },
    documentCounts: counts[state.user_id] || {},
    totalDocuments: Object.values(counts[state.user_id] || {}).reduce((a, b) => a + b, 0),
  }));

  // Get sample feed documents to verify data
  const { data: sampleFeedDocs } = await supabase
    .from('cached_documents')
    .select('reader_document_id, title, location, first_opened_at, category')
    .eq('location', 'feed')
    .limit(5);

  // Test the exact query the API would use for the feed page
  const testUserId = '486cfa76-4fcd-4ac0-870e-f06e4486d7c8';
  const {
    data: feedApiTest,
    count: feedCount,
    error: feedError,
  } = await supabase
    .from('cached_documents')
    .select('*', { count: 'exact' })
    .eq('user_id', testUserId)
    .eq('location', 'feed')
    .neq('category', 'highlight')
    .order('reader_last_moved_at', { ascending: false })
    .order('reader_updated_at', { ascending: false })
    .order('reader_created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    syncStates: result,
    sampleFeedDocs: sampleFeedDocs || [],
    allUsers: (allUsers || []).map((u) => ({ id: u.id, email: u.email })),
    feedApiTest: {
      count: feedCount,
      error: feedError?.message,
      sampleDocs: (feedApiTest || []).map((d) => ({
        id: d.reader_document_id,
        title: d.title,
        location: d.location,
      })),
    },
  });
}
