/**
 * Encryption utilities for sensitive data at rest
 * Uses AES-256-GCM encryption via Node.js crypto module
 *
 * This module provides application-level encryption for sensitive user data
 * such as Readwise API tokens and LLM API keys before storing them in the database.
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Random IV for each encryption (prevents pattern analysis)
 * - PBKDF2 key derivation from base encryption key
 * - Authenticated encryption with GCM auth tags
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_SALT = 'rsvp-reader-salt';

/**
 * Get and derive encryption key from environment
 * Uses PBKDF2 to derive a proper encryption key from the base secret
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Derive a proper key from the base64-encoded secret
  const baseKey = Buffer.from(key, 'base64');
  return crypto.pbkdf2Sync(baseKey, PBKDF2_SALT, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a string value
 * Returns base64-encoded string in format: iv:encrypted:authTag
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format "iv:ciphertext:authTag" (base64-encoded components)
 * @throws Error if encryption fails
 *
 * @example
 * const token = "my-secret-api-token";
 * const encrypted = encrypt(token);
 * // Returns: "a1b2c3...==:d4e5f6...==:g7h8i9...=="
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Return: iv:encrypted:authTag (all base64)
    return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:encrypted:authTag
 *
 * @param encryptedData - The encrypted string in format "iv:ciphertext:authTag"
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails or data is tampered
 *
 * @example
 * const encrypted = "a1b2c3...==:d4e5f6...==:g7h8i9...==";
 * const decrypted = decrypt(encrypted);
 * // Returns: "my-secret-api-token"
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format (expected iv:ciphertext:authTag)');
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
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
