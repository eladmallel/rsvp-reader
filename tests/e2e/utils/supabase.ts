/**
 * Supabase test utilities for E2E tests
 *
 * Provides helpers for:
 * - Validating Supabase configuration
 * - Managing test users (create/delete)
 * - Resetting state between tests
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Environment variables (loaded by Playwright config from .env.test)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Prefer new secret key format, fall back to legacy service_role key
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Validates that required Supabase environment variables are configured.
 * Throws an error with helpful message if not.
 */
export function ensureSupabaseConfigured(): void {
  const errors: string[] = [];

  if (!SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  }

  if (errors.length > 0) {
    throw new Error(
      `Supabase not configured for E2E tests.\n` +
        `Missing: ${errors.join(', ')}\n` +
        `\nTo fix:\n` +
        `1. Copy .env.test.example to .env.test\n` +
        `2. Start Supabase: npx supabase start\n` +
        `3. Run: npx supabase status\n` +
        `4. Copy the API URL and anon key to .env.test`
    );
  }
}

/**
 * Checks if a secret key is available for admin operations.
 * Supports both new (SUPABASE_SECRET_KEY) and legacy (SUPABASE_SERVICE_ROLE_KEY) formats.
 */
export function hasSecretKey(): boolean {
  return Boolean(SUPABASE_SECRET_KEY);
}

/**
 * @deprecated Use hasSecretKey() instead
 */
export function hasServiceRoleKey(): boolean {
  return hasSecretKey();
}

/**
 * Creates an admin Supabase client using the secret key.
 * Used for user management (create/delete test users).
 *
 * Supports both new SUPABASE_SECRET_KEY (sb_secret_...) format and
 * legacy SUPABASE_SERVICE_ROLE_KEY for backward compatibility.
 *
 * @throws Error if no secret key is configured
 */
export function createAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error(
      'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required for admin operations.\n' +
        'Add it to .env.test from: npx supabase status'
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Creates a test user in Supabase.
 * Returns the user ID if successful.
 *
 * @param email - Email address for the test user
 * @param password - Password for the test user
 * @returns User ID or null if creation failed
 */
export async function createTestUser(
  email: string,
  password: string
): Promise<{ id: string; email: string } | null> {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for test users
    });

    if (error) {
      console.warn('Failed to create test user:', error.message);
      return null;
    }

    return data.user ? { id: data.user.id, email: data.user.email! } : null;
  } catch (err) {
    console.warn('Test user creation failed:', err);
    return null;
  }
}

/**
 * Deletes a test user by email address.
 * Safe to call even if user doesn't exist.
 *
 * @param email - Email address of the user to delete
 */
export async function deleteTestUserByEmail(email: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    // Silently skip if admin operations aren't available
    return;
  }

  try {
    const adminClient = createAdminClient();

    // List users and find by email
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      // Silently skip cleanup if admin API is unavailable
      console.warn('Could not list users for cleanup:', error.message);
      return;
    }

    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return; // User not found, nothing to delete
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.warn('Could not delete test user:', deleteError.message);
    }
  } catch (err) {
    // Cleanup failure is not critical - test users in local dev are ephemeral
    console.warn('Test user cleanup failed:', err);
  }
}

/**
 * Deletes a test user by user ID.
 * Safe to call even if user doesn't exist.
 *
 * @param userId - ID of the user to delete
 */
export async function deleteTestUserById(userId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return;
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      console.warn('Could not delete test user:', error.message);
    }
  } catch (err) {
    console.warn('Test user cleanup failed:', err);
  }
}

/**
 * Generates a unique test email address
 *
 * @param prefix - Optional prefix for the email (default: 'e2e')
 * @returns Unique email address like e2e+1706531234567-abc123@example.com
 */
export function generateTestEmail(prefix = 'e2e'): string {
  const uniqueId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  return `${prefix}+${uniqueId}@example.com`;
}

/**
 * Generates a unique test password
 *
 * @returns Password that meets typical requirements (12+ chars, mixed case, number, symbol)
 */
export function generateTestPassword(): string {
  const uniqueId = Date.now().toString(36);
  return `Test${uniqueId}!Aa`;
}
