import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from './encryption';

describe('Encryption Utilities', () => {
  beforeEach(() => {
    // Ensure test encryption key is set
    if (!process.env.ENCRYPTION_KEY) {
      // Use a fixed test key (32 bytes, base64-encoded)
      process.env.ENCRYPTION_KEY = Buffer.from('test-key-32-bytes-long-exactly!').toString(
        'base64'
      );
    }
  });

  describe('encrypt()', () => {
    it('should encrypt a string', () => {
      const plaintext = 'my-secret-api-token-12345';
      const encrypted = encrypt(plaintext);

      // Encrypted string should not match plaintext
      expect(encrypted).not.toBe(plaintext);

      // Should be in correct format (base64:base64:base64)
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);

      // Should have 3 parts (iv:ciphertext:authTag)
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle empty strings', () => {
      expect(encrypt('')).toBe('');
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

    it('should handle long strings', () => {
      const longString = 'a'.repeat(10000);
      const encrypted = encrypt(longString);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longString);
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|:";\'<>?,./~`\n\t';
      const encrypted = encrypt(specialChars);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    it('should handle unicode characters', () => {
      const unicode = '你好世界 🌍 שלום עולם';
      const encrypted = encrypt(unicode);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(unicode);
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted data', () => {
      const plaintext = 'my-secret-api-token-12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      expect(decrypt('')).toBe('');
    });

    it('should throw on invalid encrypted data format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('too:many:parts:here')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('only:two')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('just-one-part')).toThrow('Invalid encrypted data format');
    });

    it('should throw on tampered ciphertext', () => {
      const plaintext = 'my-secret-api-token';
      const encrypted = encrypt(plaintext);

      // Tamper with the ciphertext part
      const parts = encrypted.split(':');
      parts[1] = 'tampered-data-abc123==';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow('Decryption failed');
    });

    it('should throw on tampered auth tag', () => {
      const plaintext = 'my-secret-api-token';
      const encrypted = encrypt(plaintext);

      // Tamper with the auth tag
      const parts = encrypted.split(':');
      parts[2] = 'tampered-tag-xyz456==';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow('Decryption failed');
    });

    it('should throw on invalid base64', () => {
      const invalid = 'invalid!!!:base64!!!:data!!!';
      expect(() => decrypt(invalid)).toThrow('Decryption failed');
    });
  });

  describe('encrypt() and decrypt() round-trip', () => {
    it('should round-trip various token formats', () => {
      const tokens = [
        'simple-token',
        'token-with-dashes-and-numbers-123',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
        'sk_test_51234567890abcdefghijklmnopqrstuvwxyz',
        'rw_access_token_with_underscores_123456',
      ];

      for (const token of tokens) {
        const encrypted = encrypt(token);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(token);
      }
    });
  });

  describe('error handling', () => {
    it('should throw if ENCRYPTION_KEY is missing', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');

      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
