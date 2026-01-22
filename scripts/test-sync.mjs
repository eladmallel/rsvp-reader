import { createReaderClient } from '../src/lib/reader/api.js';

const token = process.env.READWISE_ACCESS_TOKEN;
const client = createReaderClient(token);

async function testSync() {
  console.log('Fetching recent documents from Readwise...\n');

  const locations = ['new', 'later', 'feed'];

  for (const location of locations) {
    console.log(`\nChecking ${location}...`);
    try {
      const response = await client.listDocuments({
        location,
        pageSize: 5,
        withHtmlContent: false,
      });

      console.log(`  Found ${response.results.length} documents`);
      if (response.results.length > 0) {
        console.log(`  Most recent:`);
        response.results.slice(0, 3).forEach((doc, i) => {
          console.log(`    ${i + 1}. ${doc.title?.substring(0, 60)}...`);
          console.log(`       Updated: ${doc.updated_at}`);
        });
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }
}

testSync().catch(console.error);
