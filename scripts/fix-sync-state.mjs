import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSyncState() {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'eladmallel@gmail.com')
    .single();

  if (!users) {
    console.error('User not found');
    return;
  }

  const userId = users.id;

  console.log('Fixing sync state for user:', userId);
  console.log('\nMarking initial backfill as complete and clearing rate limit...\n');

  const { data, error } = await supabase
    .from('readwise_sync_state')
    .update({
      initial_backfill_done: true,
      next_allowed_at: null, // Clear rate limit
      window_request_count: 0, // Reset budget
      window_started_at: null,
      // Set cursors to current timestamp so incremental sync works
      library_cursor: new Date().toISOString(),
      feed_cursor: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error('Error updating sync state:', error);
  } else {
    console.log('✅ Sync state fixed!');
    console.log('You can now run manual sync and it will fetch new articles.');
  }
}

fixSyncState().catch(console.error);
