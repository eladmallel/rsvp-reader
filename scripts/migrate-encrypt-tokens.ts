/**
 * One-time data migration script to encrypt existing plaintext tokens
 *
 * This script migrates user API tokens from plaintext columns to encrypted columns:
 * - reader_access_token → reader_access_token_encrypted
 * - llm_api_key → llm_api_key_encrypted
 *
 * Safety features:
 * - Reads plaintext token
 * - Encrypts it with AES-256-GCM
 * - Verifies decryption works (round-trip test)
 * - Only then writes to encrypted column and clears plaintext
 * - Supports --dry-run mode for testing
 *
 * Usage:
 *   # Dry run (preview what will be migrated)
 *   tsx scripts/migrate-encrypt-tokens.ts --dry-run
 *
 *   # Actual migration
 *   tsx scripts/migrate-encrypt-tokens.ts
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY must be set in environment
 *   - Supabase credentials must be configured
 *   - Database migration adding encrypted columns must be applied
 */

import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '../src/lib/crypto/encryption.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.development.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.development.local');

dotenv.config({ path: envPath });

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer new secret key format, fall back to legacy service_role key
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const encryptionKey = process.env.ENCRYPTION_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('❌ Missing Supabase credentials in environment');
  console.error(
    '   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)'
  );
  process.exit(1);
}

if (!encryptionKey) {
  console.error('❌ Missing ENCRYPTION_KEY in environment');
  console.error('   Run: openssl rand -base64 32');
  console.error('   Then add to .env.development.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

interface UserTokens {
  id: string;
  reader_access_token: string | null;
  llm_api_key: string | null;
  reader_access_token_encrypted: string | null;
  llm_api_key_encrypted: string | null;
}

async function migrateTokens() {
  console.log('\n🔐 Token Encryption Migration');
  console.log('================================\n');

  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
  }

  // Get all users with tokens (either plaintext or encrypted)
  const { data: users, error } = await supabase
    .from('users')
    .select(
      'id, reader_access_token, llm_api_key, reader_access_token_encrypted, llm_api_key_encrypted'
    )
    .or(
      'reader_access_token.not.is.null,llm_api_key.not.is.null,reader_access_token_encrypted.not.is.null,llm_api_key_encrypted.not.is.null'
    );

  if (error) {
    console.error('❌ Failed to fetch users:', error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('✅ No users with tokens found. Nothing to migrate.');
    return;
  }

  console.log(`📊 Found ${users.length} user(s) with tokens\n`);

  // Analyze what needs to be migrated
  const needsReaderMigration = users.filter(
    (u) => u.reader_access_token && !u.reader_access_token_encrypted
  ).length;
  const needsLlmMigration = users.filter((u) => u.llm_api_key && !u.llm_api_key_encrypted).length;
  const alreadyEncrypted = users.filter(
    (u) => u.reader_access_token_encrypted || u.llm_api_key_encrypted
  ).length;

  console.log(`   Reader tokens to encrypt: ${needsReaderMigration}`);
  console.log(`   LLM keys to encrypt: ${needsLlmMigration}`);
  console.log(`   Already encrypted: ${alreadyEncrypted}\n`);

  if (needsReaderMigration === 0 && needsLlmMigration === 0) {
    console.log('✅ All tokens are already encrypted. Nothing to do.');
    return;
  }

  if (isDryRun) {
    console.log('✅ Dry run complete. Run without --dry-run to perform migration.');
    return;
  }

  // Perform migration
  console.log('🚀 Starting migration...\n');

  let migrated = 0;
  let errors = 0;
  let skipped = 0;

  for (const user of users as UserTokens[]) {
    const updates: Partial<UserTokens> = {};
    let changed = false;

    try {
      // Migrate reader access token
      if (user.reader_access_token && !user.reader_access_token_encrypted) {
        console.log(`   Encrypting reader token for user ${user.id}...`);
        const encrypted = encrypt(user.reader_access_token);
        const decrypted = decrypt(encrypted);

        // Verify round-trip encryption
        if (decrypted !== user.reader_access_token) {
          throw new Error('Reader token encryption verification failed');
        }

        updates.reader_access_token_encrypted = encrypted;
        updates.reader_access_token = null;
        changed = true;
      }

      // Migrate LLM API key
      if (user.llm_api_key && !user.llm_api_key_encrypted) {
        console.log(`   Encrypting LLM key for user ${user.id}...`);
        const encrypted = encrypt(user.llm_api_key);
        const decrypted = decrypt(encrypted);

        // Verify round-trip encryption
        if (decrypted !== user.llm_api_key) {
          throw new Error('LLM key encryption verification failed');
        }

        updates.llm_api_key_encrypted = encrypted;
        updates.llm_api_key = null;
        changed = true;
      }

      if (!changed) {
        skipped++;
        continue;
      }

      // Update user with encrypted tokens
      const { error: updateError } = await supabase.from('users').update(updates).eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      migrated++;
      console.log(`   ✓ Migrated user ${user.id}`);
    } catch (err) {
      errors++;
      console.error(`   ✗ Failed to migrate user ${user.id}:`, err);
    }
  }

  console.log('\n================================');
  console.log('📊 Migration Summary');
  console.log('================================\n');
  console.log(`   ✅ Successfully migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped (already encrypted): ${skipped}`);
  console.log(`   ❌ Failed: ${errors}\n`);

  if (errors > 0) {
    console.error('⚠️  Some migrations failed. Please review errors above.');
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!\n');
  console.log('📝 Next steps:');
  console.log('   1. Verify application works correctly');
  console.log('   2. Check that encrypted tokens can be decrypted');
  console.log('   3. After 30 days of verification, drop plaintext columns\n');
}

// Run migration
migrateTokens().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
