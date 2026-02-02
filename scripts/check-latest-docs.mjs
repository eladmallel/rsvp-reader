import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer new secret key format, fall back to legacy service_role key
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestDocs() {
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

  console.log('Latest cached documents:\n');

  const locations = ['new', 'later', 'archive'];

  for (const location of locations) {
    console.log(`\n${location.toUpperCase()}:`);
    const { data: docs } = await supabase
      .from('cached_documents')
      .select('title, reader_updated_at, cached_at, location')
      .eq('user_id', userId)
      .eq('location', location)
      .order('reader_updated_at', { ascending: false })
      .limit(5);

    if (!docs || docs.length === 0) {
      console.log('  No documents');
    } else {
      console.log(`  Total: ${docs.length}`);
      docs.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.title?.substring(0, 60)}...`);
        console.log(`     Updated: ${doc.reader_updated_at}`);
        console.log(`     Cached: ${doc.cached_at}`);
      });
    }
  }
}

checkLatestDocs().catch(console.error);
