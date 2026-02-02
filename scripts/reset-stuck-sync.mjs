#!/usr/bin/env node
/**
 * Reset stuck sync state for a user
 *
 * Usage:
 *   node scripts/reset-stuck-sync.mjs [email]
 *
 * If no email is provided, resets all stuck syncs.
 *
 * Requires environment variables:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY for legacy)
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first, then .env as fallback
config({ path: '.env.local' });
config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer new secret key format, fall back to legacy service_role key
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStuckSync(email) {
  let query = supabase
    .from('readwise_sync_state')
    .select('user_id, in_progress, lock_acquired_at, users!inner(email)')
    .eq('in_progress', true);

  if (email) {
    // Filter by email using the joined users table
    query = supabase
      .from('readwise_sync_state')
      .select('user_id, in_progress, lock_acquired_at, users!inner(email)')
      .eq('in_progress', true)
      .eq('users.email', email);
  }

  const { data: stuckStates, error: fetchError } = await query;

  if (fetchError) {
    console.error('Error fetching stuck states:', fetchError);
    process.exit(1);
  }

  if (!stuckStates || stuckStates.length === 0) {
    console.log('✅ No stuck syncs found');
    return;
  }

  console.log(`Found ${stuckStates.length} stuck sync(s):\n`);

  for (const state of stuckStates) {
    const userEmail = state.users?.email || 'unknown';
    console.log(`  - User: ${userEmail}`);
    console.log(`    User ID: ${state.user_id}`);
    console.log(`    Lock acquired at: ${state.lock_acquired_at || 'unknown'}`);
    console.log();
  }

  console.log('Resetting stuck syncs...\n');

  const userIds = stuckStates.map((s) => s.user_id);

  const { error: updateError } = await supabase
    .from('readwise_sync_state')
    .update({
      in_progress: false,
      lock_acquired_at: null,
    })
    .in('user_id', userIds);

  if (updateError) {
    console.error('Error resetting sync states:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully reset stuck syncs!');
  console.log('Users can now trigger a new sync.');
}

const email = process.argv[2];
if (email) {
  console.log(`Resetting stuck sync for: ${email}\n`);
} else {
  console.log('Resetting all stuck syncs...\n');
}

resetStuckSync(email).catch(console.error);
