#!/usr/bin/env node

/**
 * Reset sync state to trigger a full resync
 *
 * This clears all cursors and sets initial_backfill_done to false,
 * so the next sync will re-fetch all documents from scratch.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetSyncForFullResync() {
  // Get all users with sync state
  const { data: syncStates, error: fetchError } = await supabase
    .from('readwise_sync_state')
    .select('user_id');

  if (fetchError) {
    console.error('Error fetching sync states:', fetchError);
    return;
  }

  if (!syncStates || syncStates.length === 0) {
    console.log('No sync states found');
    return;
  }

  console.log(`Found ${syncStates.length} user(s) with sync state`);

  for (const state of syncStates) {
    console.log(`\nResetting sync state for user: ${state.user_id}`);

    const { error: updateError } = await supabase
      .from('readwise_sync_state')
      .update({
        inbox_cursor: null,
        library_cursor: null,
        feed_cursor: null,
        archive_cursor: null,
        shortlist_cursor: null,
        initial_backfill_done: false,
        // Clear rate limiting to allow immediate sync
        next_allowed_at: null,
        window_request_count: 0,
        window_started_at: null,
        in_progress: false,
        lock_acquired_at: null,
      })
      .eq('user_id', state.user_id);

    if (updateError) {
      console.error(`  Error: ${updateError.message}`);
    } else {
      console.log('  ✅ Reset complete');
    }
  }

  console.log('\n🎉 All sync states reset. Next sync will do a full resync.');
  console.log('Trigger sync via: curl -X GET "http://localhost:3000/api/sync/readwise"');
}

resetSyncForFullResync().catch(console.error);
