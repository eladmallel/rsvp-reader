import { describe, it, expect } from 'vitest';
import {
  calculateBaseTime,
  hasSentenceEndingPunctuation,
  hasClausePunctuation,
  getWordLengthWithoutPunctuation,
  isLongWord,
  getPunctuationMultiplier,
  getLengthAdjustment,
  calculateWordTime,
  createTimingCalculator,
} from './timing';

describe('Timing Calculations', () => {
  describe('calculateBaseTime', () => {
    it('returns 200ms for 300 WPM', () => {
      expect(calculateBaseTime(300)).toBe(200);
    });

    it('returns 100ms for 600 WPM', () => {
      expect(calculateBaseTime(600)).toBe(100);
    });

    it('returns 600ms for 100 WPM', () => {
      expect(calculateBaseTime(100)).toBe(600);
    });

    it('returns 60ms for 1000 WPM', () => {
      expect(calculateBaseTime(1000)).toBe(60);
    });

    it('returns 0 for 0 WPM', () => {
      expect(calculateBaseTime(0)).toBe(0);
    });

    it('returns 0 for negative WPM', () => {
      expect(calculateBaseTime(-100)).toBe(0);
    });
  });

  describe('hasSentenceEndingPunctuation', () => {
    it('returns true for words ending with period', () => {
      expect(hasSentenceEndingPunctuation('hello.')).toBe(true);
      expect(hasSentenceEndingPunctuation('end.')).toBe(true);
    });

    it('returns true for words ending with exclamation', () => {
      expect(hasSentenceEndingPunctuation('wow!')).toBe(true);
      expect(hasSentenceEndingPunctuation('hello!')).toBe(true);
    });

    it('returns true for words ending with question mark', () => {
      expect(hasSentenceEndingPunctuation('why?')).toBe(true);
      expect(hasSentenceEndingPunctuation('what?')).toBe(true);
    });

    it('returns true for CJK sentence-ending punctuation', () => {
      expect(hasSentenceEndingPunctuation('です。')).toBe(true);
      expect(hasSentenceEndingPunctuation('好！')).toBe(true);
      expect(hasSentenceEndingPunctuation('吗？')).toBe(true);
    });

    it('returns false for words without sentence-ending punctuation', () => {
      expect(hasSentenceEndingPunctuation('hello')).toBe(false);
      expect(hasSentenceEndingPunctuation('hello,')).toBe(false);
      expect(hasSentenceEndingPunctuation('hello:')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasSentenceEndingPunctuation('')).toBe(false);
    });
  });

  describe('hasClausePunctuation', () => {
    it('returns true for words ending with comma', () => {
      expect(hasClausePunctuation('hello,')).toBe(true);
      expect(hasClausePunctuation('however,')).toBe(true);
    });

    it('returns true for words ending with colon', () => {
      expect(hasClausePunctuation('note:')).toBe(true);
    });

    it('returns true for words ending with semicolon', () => {
      expect(hasClausePunctuation('stop;')).toBe(true);
    });

    it('returns true for words ending with em dash', () => {
      expect(hasClausePunctuation('wait—')).toBe(true);
      expect(hasClausePunctuation('pause–')).toBe(true);
    });

    it('returns true for CJK clause punctuation', () => {
      expect(hasClausePunctuation('好、')).toBe(true);
      expect(hasClausePunctuation('是；')).toBe(true);
      expect(hasClausePunctuation('说：')).toBe(true);
    });

    it('returns false for words without clause punctuation', () => {
      expect(hasClausePunctuation('hello')).toBe(false);
      expect(hasClausePunctuation('hello.')).toBe(false);
      expect(hasClausePunctuation('hello!')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasClausePunctuation('')).toBe(false);
    });
  });

  describe('getWordLengthWithoutPunctuation', () => {
    it('returns length for words without punctuation', () => {
      expect(getWordLengthWithoutPunctuation('hello')).toBe(5);
      expect(getWordLengthWithoutPunctuation('a')).toBe(1);
      expect(getWordLengthWithoutPunctuation('extraordinary')).toBe(13);
    });

    it('excludes trailing punctuation', () => {
      expect(getWordLengthWithoutPunctuation('hello.')).toBe(5);
      expect(getWordLengthWithoutPunctuation('hello!')).toBe(5);
      expect(getWordLengthWithoutPunctuation('hello?')).toBe(5);
      expect(getWordLengthWithoutPunctuation('hello,')).toBe(5);
      expect(getWordLengthWithoutPunctuation('hello...')).toBe(5);
    });

    it('handles multiple trailing punctuation', () => {
      expect(getWordLengthWithoutPunctuation('what?!')).toBe(4);
      expect(getWordLengthWithoutPunctuation('wow!!!')).toBe(3);
    });

    it('returns 0 for empty string', () => {
      expect(getWordLengthWithoutPunctuation('')).toBe(0);
    });

    it('returns 0 for punctuation-only strings', () => {
      expect(getWordLengthWithoutPunctuation('...')).toBe(0);
      expect(getWordLengthWithoutPunctuation('!')).toBe(0);
    });
  });

  describe('isLongWord', () => {
    it('returns false for words with 8 or fewer characters', () => {
      expect(isLongWord('hello')).toBe(false); // 5 chars
      expect(isLongWord('reading')).toBe(false); // 7 chars
      expect(isLongWord('computer')).toBe(false); // 8 chars
    });

    it('returns true for words with more than 8 characters', () => {
      expect(isLongWord('computing')).toBe(true); // 9 chars
      expect(isLongWord('extraordinary')).toBe(true); // 13 chars
      expect(isLongWord('internationalization')).toBe(true); // 20 chars
    });

    it('excludes punctuation when counting', () => {
      expect(isLongWord('computer.')).toBe(false); // 8 chars without punctuation
      expect(isLongWord('computing.')).toBe(true); // 9 chars without punctuation
    });

    it('returns false for empty string', () => {
      expect(isLongWord('')).toBe(false);
    });
  });

  describe('getPunctuationMultiplier', () => {
    it('returns 3 for sentence-ending punctuation', () => {
      expect(getPunctuationMultiplier('end.')).toBe(3);
      expect(getPunctuationMultiplier('wow!')).toBe(3);
      expect(getPunctuationMultiplier('what?')).toBe(3);
    });

    it('returns 2 for clause punctuation', () => {
      expect(getPunctuationMultiplier('however,')).toBe(2);
      expect(getPunctuationMultiplier('note:')).toBe(2);
      expect(getPunctuationMultiplier('stop;')).toBe(2);
    });

    it('returns 1 for no punctuation', () => {
      expect(getPunctuationMultiplier('hello')).toBe(1);
      expect(getPunctuationMultiplier('reading')).toBe(1);
    });
  });

  describe('getLengthAdjustment', () => {
    it('returns 0 for empty word', () => {
      expect(getLengthAdjustment('', 200)).toBe(0);
    });

    it('returns positive adjustment for words', () => {
      // For "hello" (5 chars) at 200ms base:
      // √5 × 0.04 × 200 ≈ 17.89
      const adjustment = getLengthAdjustment('hello', 200);
      expect(adjustment).toBeCloseTo(17.89, 1);
    });

    it('returns larger adjustment for longer words', () => {
      const shortAdjustment = getLengthAdjustment('hi', 200);
      const longAdjustment = getLengthAdjustment('extraordinary', 200);
      expect(longAdjustment).toBeGreaterThan(shortAdjustment);
    });

    it('excludes punctuation from length calculation', () => {
      expect(getLengthAdjustment('hello', 200)).toBe(
        getLengthAdjustment('hello.', 200)
      );
    });
  });

  describe('calculateWordTime', () => {
    const WPM = 300; // Base time = 200ms

    describe('basic timing', () => {
      it('returns 0 for empty word', () => {
        expect(calculateWordTime('', WPM)).toBe(0);
      });

      it('returns 0 for 0 WPM', () => {
        expect(calculateWordTime('hello', 0)).toBe(0);
      });

      it('calculates base time plus length adjustment for simple words', () => {
        // "hello" (5 chars) at 300 WPM:
        // base = 200ms
        // length adjustment = √5 × 0.04 × 200 ≈ 17.89
        // total ≈ 218ms
        const time = calculateWordTime('hello', WPM);
        expect(time).toBeGreaterThan(200);
        expect(time).toBeLessThan(230);
      });
    });

    describe('punctuation multipliers', () => {
      it('applies 3x multiplier for sentence-ending punctuation', () => {
        // "end." at 300 WPM:
        // base = 200ms × 3 = 600ms
        // length adjustment = √3 × 0.04 × 200 ≈ 13.86
        // total ≈ 614ms
        const time = calculateWordTime('end.', WPM);
        expect(time).toBeGreaterThan(600);
        expect(time).toBeLessThan(620);
      });

      it('applies 2x multiplier for clause punctuation', () => {
        // "but," at 300 WPM:
        // base = 200ms × 2 = 400ms
        // length adjustment = √3 × 0.04 × 200 ≈ 13.86
        // total ≈ 414ms
        const time = calculateWordTime('but,', WPM);
        expect(time).toBeGreaterThan(400);
        expect(time).toBeLessThan(420);
      });
    });

    describe('long word multiplier', () => {
      it('applies 1.5x multiplier for long words without punctuation', () => {
        // "computing" (9 chars) at 300 WPM:
        // base = 200ms × 1.5 = 300ms
        // length adjustment = √9 × 0.04 × 200 = 24
        // total = 324ms
        const time = calculateWordTime('computing', WPM);
        expect(time).toBeGreaterThan(320);
        expect(time).toBeLessThan(330);
      });

      it('does not apply long word multiplier if punctuation multiplier is applied', () => {
        // "computing." (9 chars) at 300 WPM:
        // base = 200ms × 3 = 600ms (sentence end takes precedence)
        // length adjustment = √9 × 0.04 × 200 = 24
        // total = 624ms (NOT 900ms + 24)
        const time = calculateWordTime('computing.', WPM);
        expect(time).toBe(624);
      });
    });

    describe('different WPM values', () => {
      it('halves time at double WPM', () => {
        const time300 = calculateWordTime('hello', 300);
        const time600 = calculateWordTime('hello', 600);
        // Should be roughly half (accounting for length adjustment differences)
        expect(time600).toBeLessThan(time300 * 0.6);
      });

      it('doubles time at half WPM', () => {
        const time300 = calculateWordTime('hello', 300);
        const time150 = calculateWordTime('hello', 150);
        // Should be roughly double
        expect(time150).toBeGreaterThan(time300 * 1.8);
      });
    });

    describe('real-world examples', () => {
      const testCases = [
        { word: 'I', wpm: 300, minTime: 200, maxTime: 210 },
        { word: 'the', wpm: 300, minTime: 210, maxTime: 220 },
        { word: 'hello', wpm: 300, minTime: 215, maxTime: 225 },
        { word: 'hello.', wpm: 300, minTime: 615, maxTime: 625 },
        { word: 'hello,', wpm: 300, minTime: 415, maxTime: 425 },
        { word: 'extraordinary', wpm: 300, minTime: 325, maxTime: 335 },
      ];

      testCases.forEach(({ word, wpm, minTime, maxTime }) => {
        it(`"${word}" at ${wpm} WPM is between ${minTime}-${maxTime}ms`, () => {
          const time = calculateWordTime(word, wpm);
          expect(time).toBeGreaterThanOrEqual(minTime);
          expect(time).toBeLessThanOrEqual(maxTime);
        });
      });
    });
  });

  describe('createTimingCalculator', () => {
    it('creates a calculator with default config', () => {
      const calc = createTimingCalculator();
      const time = calc('hello');
      expect(time).toBeGreaterThan(200);
      expect(time).toBeLessThan(230);
    });

    it('respects custom WPM', () => {
      const fast = createTimingCalculator({ wpm: 600 });
      const slow = createTimingCalculator({ wpm: 150 });

      const fastTime = fast('hello');
      const slowTime = slow('hello');

      expect(slowTime).toBeGreaterThan(fastTime * 3);
    });

    it('respects custom sentence end multiplier', () => {
      const gentle = createTimingCalculator({ sentenceEndMultiplier: 4 });
      const standard = createTimingCalculator({ sentenceEndMultiplier: 3 });

      const gentleTime = gentle('end.');
      const standardTime = standard('end.');

      expect(gentleTime).toBeGreaterThan(standardTime);
    });

    it('respects custom clause multiplier', () => {
      const gentle = createTimingCalculator({ clauseMultiplier: 3 });
      const standard = createTimingCalculator({ clauseMultiplier: 2 });

      const gentleTime = gentle('but,');
      const standardTime = standard('but,');

      expect(gentleTime).toBeGreaterThan(standardTime);
    });

    it('respects custom long word multiplier', () => {
      const gentle = createTimingCalculator({ longWordMultiplier: 2 });
      const standard = createTimingCalculator({ longWordMultiplier: 1.5 });

      const gentleTime = gentle('extraordinary');
      const standardTime = standard('extraordinary');

      expect(gentleTime).toBeGreaterThan(standardTime);
    });

    it('respects custom long word threshold', () => {
      const strict = createTimingCalculator({ longWordThreshold: 5 });
      const lenient = createTimingCalculator({ longWordThreshold: 10 });

      // "reading" is 7 chars
      const strictTime = strict('reading'); // gets multiplier
      const lenientTime = lenient('reading'); // no multiplier

      expect(strictTime).toBeGreaterThan(lenientTime);
    });

    it('respects custom length factor', () => {
      const high = createTimingCalculator({ lengthFactor: 0.08 });
      const low = createTimingCalculator({ lengthFactor: 0.02 });

      const highTime = high('hello');
      const lowTime = low('hello');

      expect(highTime).toBeGreaterThan(lowTime);
    });

    it('returns 0 for empty word', () => {
      const calc = createTimingCalculator();
      expect(calc('')).toBe(0);
    });
  });
});
