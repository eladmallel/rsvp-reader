import { describe, it, expect } from 'vitest';
import {
  tokenize,
  getWords,
  countWords,
  getSentenceStartIndex,
  getSentenceTokens,
  getParagraphStartIndex,
  getParagraphTokens,
  getParagraphCount,
  getSentenceCount,
  getPositionForIndex,
  getPreviousSentenceStart,
  getNextSentenceStart,
} from './tokenizer';

describe('Tokenizer', () => {
  describe('tokenize', () => {
    describe('basic tokenization', () => {
      it('returns empty array for empty string', () => {
        expect(tokenize('')).toEqual([]);
      });

      it('returns empty array for whitespace-only string', () => {
        expect(tokenize('   ')).toEqual([]);
        expect(tokenize('\n\n')).toEqual([]);
        expect(tokenize('\t\t')).toEqual([]);
      });

      it('tokenizes single word', () => {
        const tokens = tokenize('Hello');
        expect(tokens).toHaveLength(1);
        expect(tokens[0].word).toBe('Hello');
        expect(tokens[0].index).toBe(0);
        expect(tokens[0].paragraph).toBe(0);
        expect(tokens[0].sentence).toBe(0);
      });

      it('tokenizes multiple words', () => {
        const tokens = tokenize('Hello world today');
        expect(tokens).toHaveLength(3);
        expect(tokens.map((t) => t.word)).toEqual(['Hello', 'world', 'today']);
        expect(tokens.map((t) => t.index)).toEqual([0, 1, 2]);
      });

      it('preserves punctuation attached to words', () => {
        const tokens = tokenize('Hello, world!');
        expect(tokens).toHaveLength(2);
        expect(tokens[0].word).toBe('Hello,');
        expect(tokens[1].word).toBe('world!');
      });

      it('handles multiple spaces between words', () => {
        const tokens = tokenize('Hello    world');
        expect(tokens).toHaveLength(2);
        expect(tokens.map((t) => t.word)).toEqual(['Hello', 'world']);
      });

      it('handles tabs and mixed whitespace', () => {
        const tokens = tokenize('Hello\tworld\n  today');
        expect(tokens).toHaveLength(3);
        expect(tokens.map((t) => t.word)).toEqual(['Hello', 'world', 'today']);
      });
    });

    describe('RTL detection', () => {
      it('marks English words as LTR', () => {
        const tokens = tokenize('Hello world');
        expect(tokens.every((t) => t.isRtl === false)).toBe(true);
      });

      it('marks Hebrew words as RTL', () => {
        const tokens = tokenize('שלום עולם');
        expect(tokens.every((t) => t.isRtl === true)).toBe(true);
      });

      it('marks Arabic words as RTL', () => {
        const tokens = tokenize('مرحبا بالعالم');
        expect(tokens.every((t) => t.isRtl === true)).toBe(true);
      });

      it('handles mixed LTR and RTL text', () => {
        const tokens = tokenize('Hello שלום world עולם');
        expect(tokens[0].isRtl).toBe(false); // Hello
        expect(tokens[1].isRtl).toBe(true); // שלום
        expect(tokens[2].isRtl).toBe(false); // world
        expect(tokens[3].isRtl).toBe(true); // עולם
      });

      it('detects RTL with attached punctuation', () => {
        const tokens = tokenize('שלום!');
        expect(tokens[0].isRtl).toBe(true);
        expect(tokens[0].word).toBe('שלום!');
      });
    });

    describe('sentence tracking', () => {
      it('increments sentence after period', () => {
        const tokens = tokenize('First sentence. Second sentence.');
        expect(tokens[0].sentence).toBe(0); // First
        expect(tokens[1].sentence).toBe(0); // sentence.
        expect(tokens[2].sentence).toBe(1); // Second
        expect(tokens[3].sentence).toBe(1); // sentence.
      });

      it('increments sentence after exclamation', () => {
        const tokens = tokenize('Wow! Amazing!');
        expect(tokens[0].sentence).toBe(0); // Wow!
        expect(tokens[1].sentence).toBe(1); // Amazing!
      });

      it('increments sentence after question mark', () => {
        const tokens = tokenize('Why? Because.');
        expect(tokens[0].sentence).toBe(0); // Why?
        expect(tokens[1].sentence).toBe(1); // Because.
      });

      it('handles multiple sentences', () => {
        const tokens = tokenize('One. Two. Three.');
        expect(tokens[0].sentence).toBe(0);
        expect(tokens[1].sentence).toBe(1);
        expect(tokens[2].sentence).toBe(2);
      });

      it('can disable sentence tracking', () => {
        const tokens = tokenize('One. Two. Three.', { trackSentences: false });
        expect(tokens.every((t) => t.sentence === 0)).toBe(true);
      });
    });

    describe('paragraph tracking', () => {
      it('splits on double newlines', () => {
        const tokens = tokenize('First paragraph.\n\nSecond paragraph.');
        expect(tokens[0].paragraph).toBe(0);
        expect(tokens[1].paragraph).toBe(0);
        expect(tokens[2].paragraph).toBe(1);
        expect(tokens[3].paragraph).toBe(1);
      });

      it('handles multiple paragraphs', () => {
        const text = 'Para one.\n\nPara two.\n\nPara three.';
        const tokens = tokenize(text);
        expect(tokens[0].paragraph).toBe(0); // Para
        expect(tokens[1].paragraph).toBe(0); // one.
        expect(tokens[2].paragraph).toBe(1); // Para
        expect(tokens[3].paragraph).toBe(1); // two.
        expect(tokens[4].paragraph).toBe(2); // Para
        expect(tokens[5].paragraph).toBe(2); // three.
      });

      it('resets sentence count per paragraph', () => {
        const text = 'First. Second.\n\nThird. Fourth.';
        const tokens = tokenize(text);
        // First paragraph
        expect(tokens[0].sentence).toBe(0); // First.
        expect(tokens[1].sentence).toBe(1); // Second.
        // Second paragraph - sentences restart
        expect(tokens[2].sentence).toBe(0); // Third.
        expect(tokens[3].sentence).toBe(1); // Fourth.
      });

      it('ignores single newlines', () => {
        const tokens = tokenize('Same\nparagraph');
        expect(tokens[0].paragraph).toBe(0);
        expect(tokens[1].paragraph).toBe(0);
      });

      it('can disable paragraph preservation', () => {
        const text = 'First para.\n\nSecond para.';
        const tokens = tokenize(text, { preserveParagraphs: false });
        expect(tokens.every((t) => t.paragraph === 0)).toBe(true);
      });
    });

    describe('index tracking', () => {
      it('assigns sequential indices', () => {
        const tokens = tokenize('one two three four five');
        expect(tokens.map((t) => t.index)).toEqual([0, 1, 2, 3, 4]);
      });

      it('continues indices across paragraphs', () => {
        const tokens = tokenize('one two\n\nthree four');
        expect(tokens.map((t) => t.index)).toEqual([0, 1, 2, 3]);
      });
    });
  });

  describe('getWords', () => {
    it('returns array of words', () => {
      expect(getWords('Hello world')).toEqual(['Hello', 'world']);
    });

    it('returns empty array for empty string', () => {
      expect(getWords('')).toEqual([]);
    });
  });

  describe('countWords', () => {
    it('counts words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
    });

    it('returns 0 for empty string', () => {
      expect(countWords('')).toBe(0);
    });
  });

  describe('getSentenceStartIndex', () => {
    it('finds first word of sentence', () => {
      const tokens = tokenize('First sentence. Second sentence.');
      expect(getSentenceStartIndex(tokens, 0, 0)).toBe(0);
      expect(getSentenceStartIndex(tokens, 0, 1)).toBe(2);
    });

    it('returns -1 for non-existent sentence', () => {
      const tokens = tokenize('Only one sentence.');
      expect(getSentenceStartIndex(tokens, 0, 5)).toBe(-1);
    });
  });

  describe('getSentenceTokens', () => {
    it('returns all tokens in a sentence', () => {
      const tokens = tokenize('First sentence here. Second sentence.');
      const sentence0 = getSentenceTokens(tokens, 0, 0);
      const sentence1 = getSentenceTokens(tokens, 0, 1);

      expect(sentence0.map((t) => t.word)).toEqual([
        'First',
        'sentence',
        'here.',
      ]);
      expect(sentence1.map((t) => t.word)).toEqual(['Second', 'sentence.']);
    });

    it('returns empty array for non-existent sentence', () => {
      const tokens = tokenize('One sentence.');
      expect(getSentenceTokens(tokens, 0, 5)).toEqual([]);
    });
  });

  describe('getParagraphStartIndex', () => {
    it('finds first word of paragraph', () => {
      const tokens = tokenize('First para.\n\nSecond para.');
      expect(getParagraphStartIndex(tokens, 0)).toBe(0);
      expect(getParagraphStartIndex(tokens, 1)).toBe(2);
    });

    it('returns -1 for non-existent paragraph', () => {
      const tokens = tokenize('Only one paragraph.');
      expect(getParagraphStartIndex(tokens, 5)).toBe(-1);
    });
  });

  describe('getParagraphTokens', () => {
    it('returns all tokens in a paragraph', () => {
      const tokens = tokenize('First para words.\n\nSecond para here.');
      const para0 = getParagraphTokens(tokens, 0);
      const para1 = getParagraphTokens(tokens, 1);

      expect(para0.map((t) => t.word)).toEqual(['First', 'para', 'words.']);
      expect(para1.map((t) => t.word)).toEqual(['Second', 'para', 'here.']);
    });
  });

  describe('getParagraphCount', () => {
    it('returns number of paragraphs', () => {
      expect(getParagraphCount(tokenize('One para.'))).toBe(1);
      expect(getParagraphCount(tokenize('One.\n\nTwo.'))).toBe(2);
      expect(getParagraphCount(tokenize('One.\n\nTwo.\n\nThree.'))).toBe(3);
    });

    it('returns 0 for empty tokens', () => {
      expect(getParagraphCount([])).toBe(0);
    });
  });

  describe('getSentenceCount', () => {
    it('returns number of sentences in paragraph', () => {
      const tokens = tokenize('First. Second. Third.');
      expect(getSentenceCount(tokens, 0)).toBe(3);
    });

    it('returns 0 for non-existent paragraph', () => {
      const tokens = tokenize('One.');
      expect(getSentenceCount(tokens, 5)).toBe(0);
    });
  });

  describe('getPositionForIndex', () => {
    it('returns paragraph and sentence for index', () => {
      const tokens = tokenize('First. Second.\n\nThird.');
      expect(getPositionForIndex(tokens, 0)).toEqual({
        paragraph: 0,
        sentence: 0,
      });
      expect(getPositionForIndex(tokens, 1)).toEqual({
        paragraph: 0,
        sentence: 1,
      });
      expect(getPositionForIndex(tokens, 2)).toEqual({
        paragraph: 1,
        sentence: 0,
      });
    });

    it('returns null for invalid index', () => {
      const tokens = tokenize('One.');
      expect(getPositionForIndex(tokens, 100)).toBeNull();
    });
  });

  describe('getPreviousSentenceStart', () => {
    it('goes to start of current sentence if in middle', () => {
      // "First sentence here. Second sentence."
      //  0      1        2       3      4
      const tokens = tokenize('First sentence here. Second sentence.');
      // From index 4 (sentence.) go to index 3 (Second)
      expect(getPreviousSentenceStart(tokens, 4)).toBe(3);
      // From index 1 (sentence) go to index 0 (First)
      expect(getPreviousSentenceStart(tokens, 1)).toBe(0);
    });

    it('goes to previous sentence if at start', () => {
      const tokens = tokenize('First sentence. Second sentence.');
      // From index 2 (Second) which is start of sentence 1, go to sentence 0 start
      expect(getPreviousSentenceStart(tokens, 2)).toBe(0);
    });

    it('goes to previous paragraph last sentence', () => {
      const tokens = tokenize('First. Second.\n\nThird.');
      // From index 2 (Third) go to index 1 (Second.)
      expect(getPreviousSentenceStart(tokens, 2)).toBe(1);
    });

    it('returns 0 if already at beginning', () => {
      const tokens = tokenize('First sentence.');
      expect(getPreviousSentenceStart(tokens, 0)).toBe(0);
    });
  });

  describe('getNextSentenceStart', () => {
    it('goes to next sentence in same paragraph', () => {
      const tokens = tokenize('First sentence. Second sentence.');
      // From index 0, go to sentence 1 start (index 2)
      expect(getNextSentenceStart(tokens, 0)).toBe(2);
    });

    it('goes to next paragraph if at end of paragraph', () => {
      const tokens = tokenize('First.\n\nSecond.');
      // From index 0 (First.), go to index 1 (Second.)
      expect(getNextSentenceStart(tokens, 0)).toBe(1);
    });

    it('returns last index if at end', () => {
      const tokens = tokenize('Only sentence.');
      expect(getNextSentenceStart(tokens, 0)).toBe(1);
    });
  });

  describe('real-world examples', () => {
    it('handles article-like text', () => {
      const text = `The quick brown fox jumps over the lazy dog. This is a test sentence.

Second paragraph here. With multiple sentences too!

And a third paragraph? Yes indeed.`;

      const tokens = tokenize(text);

      expect(getParagraphCount(tokens)).toBe(3);
      expect(getSentenceCount(tokens, 0)).toBe(2);
      expect(getSentenceCount(tokens, 1)).toBe(2);
      expect(getSentenceCount(tokens, 2)).toBe(2);

      // Check navigation
      const firstWordSecondPara = getParagraphStartIndex(tokens, 1);
      const token = tokens[firstWordSecondPara];
      expect(token.word).toBe('Second');
    });

    it('handles Hebrew text', () => {
      const text = 'שלום עולם. מה שלומך?';
      const tokens = tokenize(text);

      expect(tokens).toHaveLength(4);
      expect(tokens.every((t) => t.isRtl)).toBe(true);
      expect(getSentenceCount(tokens, 0)).toBe(2);
    });

    it('handles mixed language text', () => {
      const text = 'Hello שלום world עולם.';
      const tokens = tokenize(text);

      expect(tokens[0]).toMatchObject({ word: 'Hello', isRtl: false });
      expect(tokens[1]).toMatchObject({ word: 'שלום', isRtl: true });
      expect(tokens[2]).toMatchObject({ word: 'world', isRtl: false });
      expect(tokens[3]).toMatchObject({ word: 'עולם.', isRtl: true });
    });
  });
});
