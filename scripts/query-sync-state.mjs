#!/usr/bin/env node

/**
 * Query sync state and document counts from Supabase
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('=== Database ===');
console.log('URL:', supabaseUrl);
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

const getCursorStatus = (cursor) => {
  if (!cursor) return 'NOT STARTED';
  if (cursor.startsWith('page:')) return 'IN PROGRESS';
  return 'COMPLETE';
};

async function querySyncState() {
  console.log('=== Sync States ===\n');

  const { data: syncStates, error: syncError } = await supabase
    .from('readwise_sync_state')
    .select('*');

  if (syncError) {
    console.error('Error fetching sync states:', syncError.message);
    return;
  }

  for (const syncState of syncStates) {
    console.log('--- User:', syncState.user_id, '---');
    console.log('Initial backfill done:', syncState.initial_backfill_done);
    console.log('In progress:', syncState.in_progress);
    console.log('Last sync at:', syncState.last_sync_at);
    console.log('Next allowed at:', syncState.next_allowed_at);
    console.log('Window started at:', syncState.window_started_at);
    console.log('Window request count:', syncState.window_request_count);
    console.log('');
    console.log('Cursors:');
    console.log(
      '  inbox:',
      getCursorStatus(syncState.inbox_cursor),
      syncState.inbox_cursor ? `(${syncState.inbox_cursor.substring(0, 30)}...)` : ''
    );
    console.log(
      '  library:',
      getCursorStatus(syncState.library_cursor),
      syncState.library_cursor ? `(${syncState.library_cursor.substring(0, 30)}...)` : ''
    );
    console.log(
      '  archive:',
      getCursorStatus(syncState.archive_cursor),
      syncState.archive_cursor ? `(${syncState.archive_cursor.substring(0, 30)}...)` : ''
    );
    console.log(
      '  shortlist:',
      getCursorStatus(syncState.shortlist_cursor),
      syncState.shortlist_cursor ? `(${syncState.shortlist_cursor.substring(0, 30)}...)` : ''
    );
    console.log(
      '  feed:',
      getCursorStatus(syncState.feed_cursor),
      syncState.feed_cursor ? `(${syncState.feed_cursor.substring(0, 30)}...)` : ''
    );

    // Get document counts for this user
    const { data: counts, error: countError } = await supabase
      .from('cached_documents')
      .select('location')
      .eq('user_id', syncState.user_id);

    if (!countError && counts) {
      const locationCounts = {};
      for (const doc of counts) {
        const loc = doc.location || 'unknown';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }

      console.log('');
      console.log('Documents:');
      for (const [loc, count] of Object.entries(locationCounts).sort()) {
        console.log(`  ${loc}: ${count}`);
      }
      console.log(`  TOTAL: ${counts.length}`);

      // Check recent cached_at times
      const { data: recentDocs, error: recentError } = await supabase
        .from('cached_documents')
        .select('reader_document_id, cached_at, location')
        .eq('user_id', syncState.user_id)
        .order('cached_at', { ascending: false })
        .limit(5);

      if (!recentError && recentDocs) {
        console.log('');
        console.log('Most recently cached:');
        for (const doc of recentDocs) {
          console.log(
            `  ${doc.location}: ${doc.reader_document_id.substring(0, 8)}... at ${doc.cached_at}`
          );
        }
      }
    }

    console.log('');
  }
}

querySyncState().catch(console.error);
