/**
 * Quick script to verify Supabase database connection and schema
 * Run with: npx tsx scripts/test-db.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testDatabase() {
  console.log('🔌 Connecting to Supabase...');
  console.log(`   URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Test 1: List all tables
  console.log('\n📋 Checking tables...');
  const { data: tables, error: tablesError } = await supabase.from('users').select('id').limit(0);

  if (tablesError && tablesError.code !== 'PGRST116') {
    console.error('❌ Error accessing users table:', tablesError.message);
  } else {
    console.log('✅ users table exists');
  }

  // Check other tables
  const tableNames = ['reading_sessions', 'chat_conversations', 'chat_messages', 'cached_articles'];

  for (const table of tableNames) {
    const { error } = await supabase.from(table).select('id').limit(0);
    if (error && error.code !== 'PGRST116') {
      console.error(`❌ Error accessing ${table}:`, error.message);
    } else {
      console.log(`✅ ${table} table exists`);
    }
  }

  console.log('\n🎉 Database schema verification complete!');
}

testDatabase().catch(console.error);
