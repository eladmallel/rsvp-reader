import { describe, it, expect } from 'vitest';
import {
  calculateORP,
  calculateORPIndex,
  getORPCharacter,
  splitWordByORP,
} from './orp';

describe('ORP (Optimal Recognition Point)', () => {
  describe('calculateORP', () => {
    describe('edge cases', () => {
      it('returns 0 for zero length', () => {
        expect(calculateORP(0)).toBe(0);
      });

      it('returns 0 for negative length', () => {
        expect(calculateORP(-1)).toBe(0);
        expect(calculateORP(-100)).toBe(0);
      });
    });

    describe('lookup table (1-13 characters)', () => {
      it('returns 0 for single character words', () => {
        expect(calculateORP(1)).toBe(0);
      });

      it('returns 1 for 2-5 character words', () => {
        expect(calculateORP(2)).toBe(1);
        expect(calculateORP(3)).toBe(1);
        expect(calculateORP(4)).toBe(1);
        expect(calculateORP(5)).toBe(1);
      });

      it('returns 2 for 6-9 character words', () => {
        expect(calculateORP(6)).toBe(2);
        expect(calculateORP(7)).toBe(2);
        expect(calculateORP(8)).toBe(2);
        expect(calculateORP(9)).toBe(2);
      });

      it('returns 3 for 10-13 character words', () => {
        expect(calculateORP(10)).toBe(3);
        expect(calculateORP(11)).toBe(3);
        expect(calculateORP(12)).toBe(3);
        expect(calculateORP(13)).toBe(3);
      });
    });

    describe('long words (>13 characters)', () => {
      it('returns 4 (max offset) for 14+ character words', () => {
        expect(calculateORP(14)).toBe(4);
        expect(calculateORP(15)).toBe(4);
        expect(calculateORP(20)).toBe(4);
        expect(calculateORP(100)).toBe(4);
      });
    });
  });

  describe('calculateORPIndex', () => {
    describe('LTR (default)', () => {
      it('returns 0 for zero length', () => {
        expect(calculateORPIndex(0)).toBe(0);
      });

      it('returns 0 for negative length', () => {
        expect(calculateORPIndex(-1)).toBe(0);
      });

      it('returns 0 for single character words', () => {
        expect(calculateORPIndex(1)).toBe(0);
      });

      it('returns correct index for 2-5 character words', () => {
        expect(calculateORPIndex(2)).toBe(1);
        expect(calculateORPIndex(3)).toBe(1);
        expect(calculateORPIndex(4)).toBe(1);
        expect(calculateORPIndex(5)).toBe(1);
      });

      it('returns correct index for 6-9 character words', () => {
        expect(calculateORPIndex(6)).toBe(2);
        expect(calculateORPIndex(7)).toBe(2);
        expect(calculateORPIndex(8)).toBe(2);
        expect(calculateORPIndex(9)).toBe(2);
      });

      it('returns correct index for 10-13 character words', () => {
        expect(calculateORPIndex(10)).toBe(3);
        expect(calculateORPIndex(11)).toBe(3);
        expect(calculateORPIndex(12)).toBe(3);
        expect(calculateORPIndex(13)).toBe(3);
      });

      it('returns 4 for words longer than 13 characters', () => {
        expect(calculateORPIndex(14)).toBe(4);
        expect(calculateORPIndex(20)).toBe(4);
        expect(calculateORPIndex(100)).toBe(4);
      });
    });

    describe('RTL', () => {
      it('returns 0 for zero length', () => {
        expect(calculateORPIndex(0, true)).toBe(0);
      });

      it('returns 0 for single character RTL words', () => {
        // length 1, offset 0, index = 1 - 1 - 0 = 0
        expect(calculateORPIndex(1, true)).toBe(0);
      });

      it('calculates ORP from right for 2-5 character RTL words', () => {
        // length 2, offset 1, index = 2 - 1 - 1 = 0
        expect(calculateORPIndex(2, true)).toBe(0);
        // length 3, offset 1, index = 3 - 1 - 1 = 1
        expect(calculateORPIndex(3, true)).toBe(1);
        // length 4, offset 1, index = 4 - 1 - 1 = 2
        expect(calculateORPIndex(4, true)).toBe(2);
        // length 5, offset 1, index = 5 - 1 - 1 = 3
        expect(calculateORPIndex(5, true)).toBe(3);
      });

      it('calculates ORP from right for 6-9 character RTL words', () => {
        // length 6, offset 2, index = 6 - 1 - 2 = 3
        expect(calculateORPIndex(6, true)).toBe(3);
        // length 7, offset 2, index = 7 - 1 - 2 = 4
        expect(calculateORPIndex(7, true)).toBe(4);
        // length 8, offset 2, index = 8 - 1 - 2 = 5
        expect(calculateORPIndex(8, true)).toBe(5);
        // length 9, offset 2, index = 9 - 1 - 2 = 6
        expect(calculateORPIndex(9, true)).toBe(6);
      });

      it('calculates ORP from right for 10-13 character RTL words', () => {
        // length 10, offset 3, index = 10 - 1 - 3 = 6
        expect(calculateORPIndex(10, true)).toBe(6);
        // length 13, offset 3, index = 13 - 1 - 3 = 9
        expect(calculateORPIndex(13, true)).toBe(9);
      });

      it('handles very long RTL words', () => {
        // length 14, offset 4, index = 14 - 1 - 4 = 9
        expect(calculateORPIndex(14, true)).toBe(9);
        // length 20, offset 4, index = 20 - 1 - 4 = 15
        expect(calculateORPIndex(20, true)).toBe(15);
      });
    });
  });

  describe('getORPCharacter', () => {
    describe('edge cases', () => {
      it('returns empty string for empty word', () => {
        expect(getORPCharacter('')).toBe('');
      });

      it('returns the single character for one-char words', () => {
        expect(getORPCharacter('I')).toBe('I');
        expect(getORPCharacter('a')).toBe('a');
      });
    });

    describe('LTR words', () => {
      it('returns correct ORP character for short words', () => {
        // "Hi" (2 chars) -> ORP at index 1 -> "i"
        expect(getORPCharacter('Hi')).toBe('i');
        // "The" (3 chars) -> ORP at index 1 -> "h"
        expect(getORPCharacter('The')).toBe('h');
        // "Test" (4 chars) -> ORP at index 1 -> "e"
        expect(getORPCharacter('Test')).toBe('e');
        // "Hello" (5 chars) -> ORP at index 1 -> "e"
        expect(getORPCharacter('Hello')).toBe('e');
      });

      it('returns correct ORP character for medium words', () => {
        // "Reader" (6 chars) -> ORP at index 2 -> "a"
        expect(getORPCharacter('Reader')).toBe('a');
        // "Reading" (7 chars) -> ORP at index 2 -> "a"
        expect(getORPCharacter('Reading')).toBe('a');
      });

      it('returns correct ORP character for long words', () => {
        // "Optimizing" (10 chars) -> ORP at index 3 -> "i"
        expect(getORPCharacter('Optimizing')).toBe('i');
      });

      it('returns correct ORP character for very long words', () => {
        // "Internationalization" (20 chars) -> ORP at index 4 -> "r"
        expect(getORPCharacter('Internationalization')).toBe('r');
      });
    });

    describe('RTL words', () => {
      it('returns correct ORP character for Hebrew words', () => {
        // "שלום" (4 chars) -> RTL ORP at index 2 -> "ו"
        expect(getORPCharacter('שלום', true)).toBe('ו');
      });

      it('returns correct ORP character for longer Hebrew words', () => {
        // "ישראל" (5 chars) -> RTL ORP at index 3 -> "א"
        expect(getORPCharacter('ישראל', true)).toBe('א');
      });
    });
  });

  describe('splitWordByORP', () => {
    describe('edge cases', () => {
      it('returns empty parts for empty word', () => {
        expect(splitWordByORP('')).toEqual({ left: '', orp: '', right: '' });
      });

      it('handles single character word', () => {
        expect(splitWordByORP('I')).toEqual({ left: '', orp: 'I', right: '' });
      });
    });

    describe('LTR words', () => {
      it('splits 2-character word correctly', () => {
        // "Hi" -> ORP at index 1
        expect(splitWordByORP('Hi')).toEqual({ left: 'H', orp: 'i', right: '' });
      });

      it('splits short words correctly', () => {
        // "Test" (4 chars) -> ORP at index 1
        expect(splitWordByORP('Test')).toEqual({
          left: 'T',
          orp: 'e',
          right: 'st',
        });
        // "Hello" (5 chars) -> ORP at index 1
        expect(splitWordByORP('Hello')).toEqual({
          left: 'H',
          orp: 'e',
          right: 'llo',
        });
      });

      it('splits medium words correctly', () => {
        // "Reading" (7 chars) -> ORP at index 2
        expect(splitWordByORP('Reading')).toEqual({
          left: 'Re',
          orp: 'a',
          right: 'ding',
        });
      });

      it('splits long words correctly', () => {
        // "Internationalization" (20 chars) -> ORP at index 4
        expect(splitWordByORP('Internationalization')).toEqual({
          left: 'Inte',
          orp: 'r',
          right: 'nationalization',
        });
      });
    });

    describe('RTL words', () => {
      it('splits Hebrew word correctly', () => {
        // "שלום" (4 chars) -> RTL ORP at index 2
        expect(splitWordByORP('שלום', true)).toEqual({
          left: 'של',
          orp: 'ו',
          right: 'ם',
        });
      });

      it('splits longer Hebrew word correctly', () => {
        // "ישראל" (5 chars) -> RTL ORP at index 3
        expect(splitWordByORP('ישראל', true)).toEqual({
          left: 'ישר',
          orp: 'א',
          right: 'ל',
        });
      });
    });
  });

  describe('integration with real words', () => {
    const testCases = [
      { word: 'a', expected: { left: '', orp: 'a', right: '' } },
      { word: 'to', expected: { left: 't', orp: 'o', right: '' } },
      { word: 'the', expected: { left: 't', orp: 'h', right: 'e' } },
      { word: 'RSVP', expected: { left: 'R', orp: 'S', right: 'VP' } },
      { word: 'speed', expected: { left: 's', orp: 'p', right: 'eed' } },
      { word: 'reader', expected: { left: 're', orp: 'a', right: 'der' } },
      { word: 'reading', expected: { left: 're', orp: 'a', right: 'ding' } },
      { word: 'algorithm', expected: { left: 'al', orp: 'g', right: 'orithm' } },
      {
        word: 'recognition',
        expected: { left: 'rec', orp: 'o', right: 'gnition' },
      },
      {
        word: 'implementation',
        expected: { left: 'impl', orp: 'e', right: 'mentation' },
      },
    ];

    testCases.forEach(({ word, expected }) => {
      it(`correctly splits "${word}"`, () => {
        expect(splitWordByORP(word)).toEqual(expected);
      });
    });
  });
});
