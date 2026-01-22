import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('Checking users table...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, reader_access_token')
    .eq('email', 'eladmallel@gmail.com');

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  console.log('Users found:', users?.length);
  console.log('Has Reader token:', !!users?.[0]?.reader_access_token);

  if (users && users.length > 0) {
    const userId = users[0].id;
    console.log('\nUser ID:', userId);
    console.log('\nChecking sync state...');

    const { data: syncState, error: syncError } = await supabase
      .from('readwise_sync_state')
      .select('*')
      .eq('user_id', userId);

    if (syncError) {
      console.error('Error fetching sync state:', syncError);
    } else if (!syncState || syncState.length === 0) {
      console.log('⚠️  NO SYNC STATE FOUND - This is the problem!');
    } else {
      console.log('Sync state:', JSON.stringify(syncState[0], null, 2));
    }

    console.log('\nChecking cached documents...');
    const { count, error: docsError } = await supabase
      .from('cached_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (docsError) {
      console.error('Error checking cached documents:', docsError);
    } else {
      console.log(`Total cached documents: ${count || 0}`);
    }
  }
}

checkDatabase().catch(console.error);
