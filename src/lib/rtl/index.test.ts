import { describe, it, expect } from 'vitest';
import { isRTL, isRTLWord, getTextDirection, getWordDirection } from './index';

describe('RTL Detection', () => {
  describe('isRTL', () => {
    it('returns false for empty string', () => {
      expect(isRTL('')).toBe(false);
    });

    it('returns false for English text', () => {
      expect(isRTL('Hello World')).toBe(false);
      expect(isRTL('The quick brown fox')).toBe(false);
    });

    it('returns true for Hebrew text', () => {
      expect(isRTL('שלום')).toBe(true);
      expect(isRTL('שלום עולם')).toBe(true);
      expect(isRTL('זהו טקסט בעברית')).toBe(true);
    });

    it('returns true for Arabic text', () => {
      expect(isRTL('مرحبا')).toBe(true);
      expect(isRTL('مرحبا بالعالم')).toBe(true);
    });

    it('returns false for numbers only', () => {
      expect(isRTL('12345')).toBe(false);
    });

    it('returns false for punctuation only', () => {
      expect(isRTL('...')).toBe(false);
      expect(isRTL('!?')).toBe(false);
    });

    it('handles mixed RTL and LTR - majority wins', () => {
      // More Hebrew than English (שלום עולם = 8 chars, Hi = 2 chars)
      expect(isRTL('שלום עולם Hi')).toBe(true);
      // More English than Hebrew (Hello World = 10 chars, שלום = 4 chars)
      expect(isRTL('Hello World שלום')).toBe(false);
      // Equal - should be false (not strictly greater)
      // שלום = 4 chars, Test = 4 chars
      expect(isRTL('שלום Test')).toBe(false);
    });

    it('ignores numbers and punctuation in detection', () => {
      expect(isRTL('שלום 123')).toBe(true);
      expect(isRTL('Hello 123')).toBe(false);
      expect(isRTL('שלום!!!')).toBe(true);
    });
  });

  describe('isRTLWord', () => {
    it('returns false for empty string', () => {
      expect(isRTLWord('')).toBe(false);
    });

    it('returns false for English word', () => {
      expect(isRTLWord('Hello')).toBe(false);
      expect(isRTLWord('world')).toBe(false);
    });

    it('returns true for Hebrew word', () => {
      expect(isRTLWord('שלום')).toBe(true);
      expect(isRTLWord('עולם')).toBe(true);
    });

    it('returns true for Arabic word', () => {
      expect(isRTLWord('مرحبا')).toBe(true);
    });

    it('checks first letter for direction', () => {
      // Hebrew word with trailing English
      expect(isRTLWord('שלום123')).toBe(true);
      // English word with trailing Hebrew
      expect(isRTLWord('Hello123')).toBe(false);
    });

    it('skips leading punctuation', () => {
      expect(isRTLWord('"שלום"')).toBe(true);
      expect(isRTLWord('"Hello"')).toBe(false);
    });

    it('returns false for numbers only', () => {
      expect(isRTLWord('123')).toBe(false);
    });
  });

  describe('getTextDirection', () => {
    it('returns ltr for English text', () => {
      expect(getTextDirection('Hello World')).toBe('ltr');
    });

    it('returns rtl for Hebrew text', () => {
      expect(getTextDirection('שלום עולם')).toBe('rtl');
    });

    it('returns ltr for empty string', () => {
      expect(getTextDirection('')).toBe('ltr');
    });
  });

  describe('getWordDirection', () => {
    it('returns ltr for English word', () => {
      expect(getWordDirection('Hello')).toBe('ltr');
    });

    it('returns rtl for Hebrew word', () => {
      expect(getWordDirection('שלום')).toBe('rtl');
    });

    it('returns ltr for empty string', () => {
      expect(getWordDirection('')).toBe('ltr');
    });
  });
});
