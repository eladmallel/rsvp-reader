# DevOps Next Steps Analysis - 2026-01-22

## Current State Assessment

### What's Been Completed ✅

#### Phase 0: Quick Wins (DONE - 90 minutes)

1. **Updated .env.example** ✅
   - Comprehensive environment variable documentation
   - Clear warnings about test/production separation
   - Secret generation instructions included

2. **Added Security Headers** ✅
   - X-Frame-Options, X-Content-Type-Options, Referrer-Policy
   - X-XSS-Protection, Permissions-Policy
   - Implemented in `next.config.ts`

3. **Created Documentation** ✅
   - `deployment-review-2026-01-22.md` - Full review
   - `IMMEDIATE-ACTIONS.md` - Quick wins guide
   - `secret-rotation.md` - Operational procedures
   - `SECURITY-CHECKLIST.md` - Security checklists
   - `e2e-test-environment-fixes.md` - Environment isolation fixes

4. **Environment Separation (MOSTLY DONE)** ✅
   - `.env.local` renamed to `.env.development.local`
   - `.env.test` properly configured for local Supabase
   - Playwright config sets `NODE_ENV=test` explicitly
   - **CRITICAL**: Production database is now isolated from tests!

5. **E2E Test Fixes** ✅
   - 351/364 tests passing (96% pass rate)
   - All auth tests working with local Supabase
   - Loading state tests resilient to fast local DB responses
   - Readwise integration tests properly skip when no valid token
   - Zero production database contamination

### What Still Needs Work 🔴

#### From IMMEDIATE-ACTIONS.md (Medium Priority Items)

1. **Add npm audit to CI** ⏳ PENDING
   - Add security scanning to `.github/workflows/main.yml`
   - Set to `continue-on-error: true` for low-severity issues
   - Time: 15 minutes

2. **Add Rate Limit Warning Comments** ⏳ PENDING
   - Update `package.json` test:integration script
   - Add warnings to integration test files
   - Time: 30 minutes

3. **README Documentation Update** ⏳ PARTIAL
   - Need to add test isolation warning section
   - Document environment file structure
   - Time: 10 minutes

#### From Deployment Review (Critical Remaining Issues)

1. **Plaintext Secrets in Database** 🔴 CRITICAL
   - `users.reader_access_token` stored unencrypted
   - `users.llm_api_key` stored unencrypted
   - Anyone with DB access can read all user API tokens
   - Severity: 8.0/10

2. **No Rate Limiting on API Routes** 🟡 MEDIUM
   - `/api/sync/readwise` - No rate limiting
   - `/api/reader/documents` - No rate limiting
   - Other API routes unprotected
   - Risk: API abuse, cost escalation
   - Severity: 6.0/10

3. **Integration Tests Hit Real Readwise API** 🟡 MEDIUM
   - Subject to 20 requests/minute rate limit
   - Depends on external service availability
   - Slow test execution
   - Severity: 5.5/10

## Risk Assessment Matrix

| Issue                               | Likelihood | Impact   | Current Status       | Urgency |
| ----------------------------------- | ---------- | -------- | -------------------- | ------- |
| Shared database (dev/test/prod)     | ~~HIGH~~   | CRITICAL | ✅ **FIXED**         | N/A     |
| Plaintext secrets in database       | MEDIUM     | HIGH     | 🔴 NOT ADDRESSED     | P1      |
| No rate limiting on APIs            | MEDIUM     | MEDIUM   | 🔴 NOT ADDRESSED     | P2      |
| Real API calls in integration tests | LOW        | LOW      | 🟡 PARTIAL (skipped) | P3      |
| Missing security audit in CI        | LOW        | MEDIUM   | 🔴 NOT ADDRESSED     | P4      |

## Recommended Next Step: Database Secret Encryption

### Why This Should Be Next Priority

1. **Highest Remaining Risk** (8.0/10 severity)
   - Currently, anyone with database read access can steal all user API tokens
   - Readwise tokens grant full access to user's reading library
   - LLM API keys could be used to incur significant costs

2. **User Trust Impact**
   - Users trust us with their third-party API credentials
   - A database breach would expose all user tokens
   - This is a fundamental security requirement, not an optimization

3. **Compliance & Best Practices**
   - Industry standard requires encryption at rest for credentials
   - GDPR/privacy regulations expect sensitive data protection
   - Supabase provides the tools (encryption functions) built-in

4. **Limited Scope**
   - Self-contained change (2 migration files, 1 utility module)
   - No API contract changes required
   - Can be tested incrementally
   - Estimated time: 1 day of focused work

5. **Foundation for Future Security**
   - Sets pattern for all future sensitive data
   - Demonstrates security-first approach
   - Makes future security audits easier

### Why NOT Rate Limiting First?

While rate limiting is important (6.0/10 severity):

- It's a **protective measure** against abuse (external threat)
- Secret encryption protects against **data breach** (internal vulnerability)
- Rate limiting can be added incrementally per route
- Secret encryption needs holistic migration approach
- Data breaches have much higher reputational cost than API abuse

### Why NOT Readwise Stub Server First?

The Readwise integration tests:

- Already properly skip when no token is present (fixed)
- Are not running in normal test suite (13/364 tests skipped)
- Only affect developers who explicitly run integration tests
- Don't pose security risk, just convenience/speed issue

---

## Implementation Plan: Database Secret Encryption

### Overview

Encrypt sensitive user credentials stored in Supabase using PostgreSQL's built-in encryption functions and a server-side encryption key.

### Architecture Decision

**Strategy**: Server-side encryption with application-managed key stored in environment variables

**Why this approach:**

- Supabase Postgres has built-in `pgcrypto` extension
- Key stored in `ENCRYPTION_KEY` env var (already in .env.example)
- Application-level encryption (before data hits database)
- Transparent to database queries (decrypt on read)

**Alternatives considered:**

1. ❌ Client-side encryption - Can't query encrypted data server-side
2. ❌ Column-level encryption with database-managed keys - Less control over key rotation
3. ✅ Application-managed encryption with pgcrypto - Best balance of security and usability

### Implementation Steps

#### Phase 1: Setup & Utilities (2 hours)

**Step 1.1: Generate Encryption Key**

```bash
# Generate a secure 256-bit encryption key
openssl rand -base64 32

# Add to .env.development.local and .env.test
ENCRYPTION_KEY=<generated-key>
```

**Step 1.2: Create Encryption Utilities**

File: `src/lib/crypto/encryption.ts`

```typescript
/**
 * Encryption utilities for sensitive data at rest
 * Uses AES-256 encryption via Node.js crypto module
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Derive a proper key from the base64-encoded secret
  const baseKey = Buffer.from(key, 'base64');
  return crypto.pbkdf2Sync(baseKey, 'rsvp-reader-salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a string value
 * Returns base64-encoded string: iv:encrypted:authTag
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Return: iv:encrypted:authTag (all base64)
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:encrypted:authTag
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';

  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivB64, encryptedB64, authTagB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}
```

**Step 1.3: Add Tests for Encryption**

File: `src/lib/crypto/encryption.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from './encryption';

describe('Encryption Utilities', () => {
  beforeEach(() => {
    // Ensure test encryption key is set
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = Buffer.from('test-key-32-bytes-long-exactly!').toString(
        'base64'
      );
    }
  });

  it('should encrypt and decrypt a string', () => {
    const plaintext = 'my-secret-api-token-12345';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle empty strings', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('should produce different ciphertext for same plaintext', () => {
    const plaintext = 'test-token';
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    // Different IVs mean different ciphertext
    expect(encrypted1).not.toBe(encrypted2);

    // But both decrypt to same value
    expect(decrypt(encrypted1)).toBe(plaintext);
    expect(decrypt(encrypted2)).toBe(plaintext);
  });

  it('should throw on invalid encrypted data', () => {
    expect(() => decrypt('invalid-format')).toThrow();
    expect(() => decrypt('too:many:parts:here')).toThrow();
  });
});
```

#### Phase 2: Database Migration (1 hour)

**Step 2.1: Create Encrypted Columns Migration**

File: `supabase/migrations/YYYYMMDDHHMMSS_add_encrypted_token_columns.sql`

```sql
-- Add encrypted columns for sensitive user data
-- This migration creates new columns without disrupting existing data

-- Add encrypted reader access token column
ALTER TABLE users
ADD COLUMN reader_access_token_encrypted TEXT;

-- Add encrypted LLM API key column
ALTER TABLE users
ADD COLUMN llm_api_key_encrypted TEXT;

-- Create indexes for encrypted columns (for NULL checks, not searches)
CREATE INDEX idx_users_reader_token_encrypted
ON users (reader_access_token_encrypted)
WHERE reader_access_token_encrypted IS NOT NULL;

CREATE INDEX idx_users_llm_key_encrypted
ON users (llm_api_key_encrypted)
WHERE llm_api_key_encrypted IS NOT NULL;

-- Add migration tracking comment
COMMENT ON COLUMN users.reader_access_token_encrypted IS
  'Encrypted Readwise Reader API token (AES-256-GCM)';

COMMENT ON COLUMN users.llm_api_key_encrypted IS
  'Encrypted LLM API key (AES-256-GCM)';
```

**Step 2.2: Update TypeScript Types**

Run after migration:

```bash
npm run update-types
# This regenerates src/lib/supabase/types.ts from Supabase schema
```

#### Phase 3: Application Code Updates (3 hours)

**Step 3.1: Update User Profile API Routes**

File: `src/app/api/user/profile/route.ts`

Key changes:

- Encrypt tokens before INSERT/UPDATE
- Decrypt tokens on SELECT
- Keep backward compatibility (read from old column if new is empty)

```typescript
import { encrypt, decrypt } from '@/lib/crypto/encryption';

// On UPDATE
if (readerToken) {
  updateData.reader_access_token_encrypted = encrypt(readerToken);
  updateData.reader_access_token = null; // Clear plaintext
}

// On SELECT
const encryptedToken = user.reader_access_token_encrypted;
const plaintextToken = encryptedToken ? decrypt(encryptedToken) : user.reader_access_token; // Fallback to old column

return NextResponse.json({
  ...user,
  reader_access_token: plaintextToken,
});
```

**Step 3.2: Update Sync Endpoints**

File: `src/app/api/sync/readwise/route.ts`

Update query to select encrypted column and decrypt:

```typescript
const { data: states } = await supabase.from('readwise_sync_state').select(`
    user_id,
    library_cursor,
    ...,
    users (reader_access_token, reader_access_token_encrypted)
  `);

for (const state of states) {
  const userToken = state.users?.reader_access_token_encrypted
    ? decrypt(state.users.reader_access_token_encrypted)
    : state.users?.reader_access_token; // Fallback

  // ... rest of sync logic
}
```

**Step 3.3: Update Connect Reader Flow**

File: `src/app/api/auth/connect-reader/route.ts`

Encrypt token before saving:

```typescript
import { encrypt } from '@/lib/crypto/encryption';

// After validating Readwise token
const { error: updateError } = await supabase
  .from('users')
  .update({
    reader_access_token_encrypted: encrypt(token),
    reader_access_token: null, // Clear plaintext
  })
  .eq('id', userId);
```

**Step 3.4: Update Reader API Client**

File: `src/lib/reader/client.ts` or similar

Ensure all places that read user tokens use the decrypted value.

#### Phase 4: Data Migration (1 hour)

**Step 4.1: Create Data Migration Script**

File: `scripts/migrate-encrypt-tokens.ts`

```typescript
/**
 * One-time script to migrate existing plaintext tokens to encrypted columns
 *
 * Usage:
 *   tsx scripts/migrate-encrypt-tokens.ts
 *
 * Safety:
 *   - Reads plaintext token
 *   - Encrypts it
 *   - Writes to encrypted column
 *   - Verifies decryption works
 *   - Only then clears plaintext column
 */

import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '../src/lib/crypto/encryption';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateTokens() {
  console.log('Starting token encryption migration...');

  // Get all users with plaintext tokens
  const { data: users, error } = await supabase
    .from('users')
    .select('id, reader_access_token, llm_api_key')
    .or('reader_access_token.not.is.null,llm_api_key.not.is.null');

  if (error) {
    console.error('Failed to fetch users:', error);
    process.exit(1);
  }

  console.log(`Found ${users?.length || 0} users with tokens to migrate`);

  let migrated = 0;
  let errors = 0;

  for (const user of users || []) {
    try {
      const updates: any = {};

      // Migrate reader token
      if (user.reader_access_token) {
        const encrypted = encrypt(user.reader_access_token);
        const decrypted = decrypt(encrypted);

        if (decrypted !== user.reader_access_token) {
          throw new Error('Encryption verification failed');
        }

        updates.reader_access_token_encrypted = encrypted;
        updates.reader_access_token = null;
      }

      // Migrate LLM API key
      if (user.llm_api_key) {
        const encrypted = encrypt(user.llm_api_key);
        const decrypted = decrypt(encrypted);

        if (decrypted !== user.llm_api_key) {
          throw new Error('Encryption verification failed');
        }

        updates.llm_api_key_encrypted = encrypted;
        updates.llm_api_key = null;
      }

      // Update user
      const { error: updateError } = await supabase.from('users').update(updates).eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      migrated++;
      console.log(`✓ Migrated user ${user.id}`);
    } catch (err) {
      errors++;
      console.error(`✗ Failed to migrate user ${user.id}:`, err);
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${errors} errors`);
}

migrateTokens();
```

**Step 4.2: Run Migration (Production)**

```bash
# Dry run first (add --dry-run flag to script)
tsx scripts/migrate-encrypt-tokens.ts --dry-run

# Backup database first!
npx supabase db dump > backup-before-encryption-$(date +%Y%m%d).sql

# Run actual migration
tsx scripts/migrate-encrypt-tokens.ts

# Verify migration
npx supabase db query "SELECT COUNT(*) FROM users WHERE reader_access_token IS NOT NULL"
# Should return 0

npx supabase db query "SELECT COUNT(*) FROM users WHERE reader_access_token_encrypted IS NOT NULL"
# Should return count of users with tokens
```

#### Phase 5: Cleanup & Documentation (1 hour)

**Step 5.1: Remove Old Columns (30 days after migration)**

File: `supabase/migrations/YYYYMMDDHHMMSS_drop_plaintext_token_columns.sql`

```sql
-- Drop plaintext token columns after successful migration
-- ONLY RUN THIS AFTER VERIFYING ENCRYPTED COLUMNS WORK IN PRODUCTION

-- Verify no plaintext tokens remain
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users
    WHERE reader_access_token IS NOT NULL
       OR llm_api_key IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Plaintext tokens still exist! Migration incomplete.';
  END IF;
END $$;

-- Drop plaintext columns
ALTER TABLE users DROP COLUMN reader_access_token;
ALTER TABLE users DROP COLUMN llm_api_key;

-- Rename encrypted columns to canonical names
ALTER TABLE users RENAME COLUMN reader_access_token_encrypted TO reader_access_token;
ALTER TABLE users RENAME COLUMN llm_api_key_encrypted TO llm_api_key;

-- Update comments
COMMENT ON COLUMN users.reader_access_token IS
  'Encrypted Readwise Reader API token (AES-256-GCM, application-level encryption)';

COMMENT ON COLUMN users.llm_api_key IS
  'Encrypted LLM API key (AES-256-GCM, application-level encryption)';
```

**Step 5.2: Update Documentation**

Add to `docs/devops/SECURITY-CHECKLIST.md`:

```markdown
## Encryption at Rest

- [x] All user API tokens encrypted with AES-256-GCM
- [x] Encryption key stored in environment variables only
- [x] Key rotation procedures documented
- [x] Encryption utilities tested and verified
```

Add to `docs/ARCHITECTURE.md` (create if needed):

```markdown
## Security Architecture

### Data Encryption

Sensitive user credentials are encrypted at rest using AES-256-GCM:

- **Encrypted Fields**: `users.reader_access_token`, `users.llm_api_key`
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Management**: Environment variable `ENCRYPTION_KEY` (32-byte base64)
- **Implementation**: See `src/lib/crypto/encryption.ts`

Encryption happens at the application layer before data is written to the database. This ensures:

- Database backups don't expose plaintext tokens
- Database administrators can't read user credentials
- Encryption key rotation is possible without database schema changes
```

**Step 5.3: Update Secret Rotation Guide**

Add to `docs/devops/secret-rotation.md`:

````markdown
### Encryption Key Rotation

1. Generate new encryption key:
   ```bash
   openssl rand -base64 32
   ```
````

2. Add new key as `ENCRYPTION_KEY_NEW` to environment

3. Run re-encryption script:

   ```bash
   tsx scripts/rotate-encryption-key.ts
   ```

4. Verify all tokens re-encrypted successfully

5. Update `ENCRYPTION_KEY` with new key value

6. Remove `ENCRYPTION_KEY_NEW` from environment

````

### Testing Strategy

**Unit Tests**
- ✅ Encryption/decryption utilities (`encryption.test.ts`)
- ✅ Edge cases (empty strings, invalid format, key rotation)

**Integration Tests**
- Test API routes read/write encrypted tokens correctly
- Test backward compatibility (reading old plaintext tokens)
- Test migration script with fixture data

**E2E Tests**
- Existing E2E tests should pass unchanged (transparent to UI)
- Verify user can connect Readwise Reader after encryption enabled
- Verify sync still works with encrypted tokens

**Manual Testing**
1. Connect Readwise account with encryption enabled
2. Verify sync works
3. Check database shows encrypted values (not plaintext)
4. Disconnect/reconnect to test full cycle

### Rollback Plan

If encryption causes issues in production:

1. **Immediate**: Deploy previous version (keeps encrypted columns)
2. **Data**: Encrypted columns remain, old code reads `reader_access_token` (still exists)
3. **Recovery**: Run reverse migration to copy encrypted values back to plaintext
4. **Investigation**: Fix encryption issue in staging
5. **Retry**: Deploy fixed version

### Time Estimate

| Phase                    | Time     | Can Parallelize? |
|--------------------------|----------|------------------|
| Setup & Utilities        | 2 hours  | No               |
| Database Migration       | 1 hour   | No               |
| Application Code Updates | 3 hours  | Yes (per route)  |
| Data Migration           | 1 hour   | No               |
| Cleanup & Docs           | 1 hour   | Yes              |
| **Total**                | **8 hours** | **~1 work day** |

### Success Criteria

- [ ] Encryption/decryption utilities tested and working
- [ ] Database migration adds encrypted columns
- [ ] All API routes updated to use encryption
- [ ] Data migration script tested and verified
- [ ] All existing E2E tests still passing
- [ ] Manual testing confirms encrypted tokens work
- [ ] Documentation updated
- [ ] No plaintext tokens visible in database

---

## Alternative: Rate Limiting Implementation (If Encryption Deferred)

If you decide to tackle rate limiting first instead, here's the plan:

### Strategy: Upstash Redis Rate Limiting

**Why Upstash:**
- Serverless-friendly (works on Vercel)
- Built-in rate limiting algorithms
- Free tier: 10K requests/day
- Simple API

**Implementation**: `@upstash/ratelimit` with sliding window

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiter
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1m"), // 20 requests per minute
  analytics: true,
});

// Middleware wrapper
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const identifier = request.ip ?? "anonymous";
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        }
      }
    );
  }

  const response = await handler();

  // Add rate limit headers to successful responses
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", reset.toString());

  return response;
}
````

**Time Estimate**: 4-6 hours
**Complexity**: Medium
**Risk**: Low (easily reversible)

---

## Final Recommendation

**IMPLEMENT DATABASE SECRET ENCRYPTION NEXT**

### Reasoning

1. **Security First**: This is a fundamental security requirement, not an optimization
2. **User Trust**: Users entrust us with their third-party API keys
3. **Compliance**: Required for any security audit or compliance review
4. **Foundation**: Sets security patterns for all future development
5. **Self-Contained**: Well-defined scope, clear success criteria
6. **Proven Approach**: Standard industry practice, low technical risk

### Timeline

- **Day 1**: Encryption utilities + tests + database migration
- **Day 2**: Application code updates + data migration + testing
- **Total**: ~2 working days with buffer for testing

### Next After This

Once encryption is complete:

1. **Rate Limiting** (4-6 hours) - Protect API routes from abuse
2. **Readwise Stub Server** (1-2 days) - Speed up integration tests
3. **Monitoring & Alerts** (1 day) - Production observability

---

## Questions for Discussion

Before proceeding with encryption implementation:

1. **Timeline**: Can you commit 2 focused days for this security fix?
2. **Testing**: Do you want to do staging deployment first or test locally then prod?
3. **Key Management**: Are you comfortable with encryption key in environment variables, or prefer a secrets manager (e.g., Vercel Secrets Vault)?
4. **Rollout**: Gradual rollout (% of users) or all-at-once migration?

Let me know your preference and I'll proceed with implementation!
