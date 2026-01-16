/**
 * Word tokenizer for RSVP reading
 *
 * Splits text into words while preserving:
 * - Punctuation attached to words
 * - RTL direction detection per word
 * - Paragraph boundaries
 */

import { isRTLWord } from '@/lib/rtl';

/**
 * A token representing a word in the text
 */
export interface WordToken {
  /** The word text (including attached punctuation) */
  word: string;
  /** Whether this word is RTL (Hebrew, Arabic, etc.) */
  isRtl: boolean;
  /** Index of the word in the original text */
  index: number;
  /** Paragraph number (0-based) */
  paragraph: number;
  /** Sentence number within paragraph (0-based) */
  sentence: number;
}

/**
 * Options for tokenization
 */
export interface TokenizerOptions {
  /** Whether to preserve empty lines as paragraph breaks (default: true) */
  preserveParagraphs?: boolean;
  /** Whether to track sentence boundaries (default: true) */
  trackSentences?: boolean;
}

/**
 * Characters that end sentences
 */
const SENTENCE_ENDINGS = /[.!?。！？]/;

/**
 * Check if a word ends a sentence
 */
function endsSentence(word: string): boolean {
  if (!word || word.length === 0) return false;
  return SENTENCE_ENDINGS.test(word[word.length - 1]);
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines or more
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Split a paragraph into words, preserving punctuation attached to words
 */
function splitIntoWords(paragraph: string): string[] {
  // Split on whitespace, filter out empty strings
  return paragraph
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/**
 * Tokenize text into words with metadata.
 *
 * @param text - The text to tokenize
 * @param options - Tokenization options
 * @returns Array of word tokens
 *
 * @example
 * tokenize("Hello world. How are you?")
 * // Returns tokens for each word with RTL detection and sentence tracking
 *
 * @example
 * tokenize("שלום עולם")
 * // Returns tokens with isRtl: true for Hebrew words
 */
export function tokenize(
  text: string,
  options: TokenizerOptions = {}
): WordToken[] {
  const { preserveParagraphs = true, trackSentences = true } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const tokens: WordToken[] = [];
  let globalIndex = 0;

  if (preserveParagraphs) {
    const paragraphs = splitIntoParagraphs(text);

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const words = splitIntoWords(paragraph);
      let sentenceIndex = 0;

      words.forEach((word) => {
        tokens.push({
          word,
          isRtl: isRTLWord(word),
          index: globalIndex++,
          paragraph: paragraphIndex,
          sentence: sentenceIndex,
        });

        if (trackSentences && endsSentence(word)) {
          sentenceIndex++;
        }
      });
    });
  } else {
    // Simple mode: treat as single paragraph
    const words = splitIntoWords(text);
    let sentenceIndex = 0;

    words.forEach((word) => {
      tokens.push({
        word,
        isRtl: isRTLWord(word),
        index: globalIndex++,
        paragraph: 0,
        sentence: sentenceIndex,
      });

      if (trackSentences && endsSentence(word)) {
        sentenceIndex++;
      }
    });
  }

  return tokens;
}

/**
 * Get just the words from text as a simple array.
 * Useful when you don't need the full token metadata.
 *
 * @param text - The text to tokenize
 * @returns Array of words
 */
export function getWords(text: string): string[] {
  return tokenize(text).map((t) => t.word);
}

/**
 * Count the total number of words in text.
 *
 * @param text - The text to count
 * @returns Number of words
 */
export function countWords(text: string): number {
  return tokenize(text).length;
}

/**
 * Get the index of the first word in a given sentence.
 *
 * @param tokens - Array of word tokens
 * @param paragraph - Paragraph number
 * @param sentence - Sentence number within paragraph
 * @returns Index of first word, or -1 if not found
 */
export function getSentenceStartIndex(
  tokens: WordToken[],
  paragraph: number,
  sentence: number
): number {
  const token = tokens.find(
    (t) => t.paragraph === paragraph && t.sentence === sentence
  );
  return token?.index ?? -1;
}

/**
 * Get all tokens in a given sentence.
 *
 * @param tokens - Array of word tokens
 * @param paragraph - Paragraph number
 * @param sentence - Sentence number within paragraph
 * @returns Array of tokens in the sentence
 */
export function getSentenceTokens(
  tokens: WordToken[],
  paragraph: number,
  sentence: number
): WordToken[] {
  return tokens.filter(
    (t) => t.paragraph === paragraph && t.sentence === sentence
  );
}

/**
 * Get the index of the first word in a given paragraph.
 *
 * @param tokens - Array of word tokens
 * @param paragraph - Paragraph number
 * @returns Index of first word, or -1 if not found
 */
export function getParagraphStartIndex(
  tokens: WordToken[],
  paragraph: number
): number {
  const token = tokens.find((t) => t.paragraph === paragraph);
  return token?.index ?? -1;
}

/**
 * Get all tokens in a given paragraph.
 *
 * @param tokens - Array of word tokens
 * @param paragraph - Paragraph number
 * @returns Array of tokens in the paragraph
 */
export function getParagraphTokens(
  tokens: WordToken[],
  paragraph: number
): WordToken[] {
  return tokens.filter((t) => t.paragraph === paragraph);
}

/**
 * Get the total number of paragraphs in the token array.
 *
 * @param tokens - Array of word tokens
 * @returns Number of paragraphs
 */
export function getParagraphCount(tokens: WordToken[]): number {
  if (tokens.length === 0) return 0;
  const lastToken = tokens[tokens.length - 1];
  return lastToken.paragraph + 1;
}

/**
 * Get the total number of sentences in a paragraph.
 *
 * @param tokens - Array of word tokens
 * @param paragraph - Paragraph number
 * @returns Number of sentences in the paragraph
 */
export function getSentenceCount(
  tokens: WordToken[],
  paragraph: number
): number {
  const paragraphTokens = getParagraphTokens(tokens, paragraph);
  if (paragraphTokens.length === 0) return 0;
  const lastToken = paragraphTokens[paragraphTokens.length - 1];
  return lastToken.sentence + 1;
}

/**
 * Find the paragraph and sentence for a given word index.
 *
 * @param tokens - Array of word tokens
 * @param index - Word index
 * @returns Object with paragraph and sentence, or null if not found
 */
export function getPositionForIndex(
  tokens: WordToken[],
  index: number
): { paragraph: number; sentence: number } | null {
  const token = tokens.find((t) => t.index === index);
  if (!token) return null;
  return { paragraph: token.paragraph, sentence: token.sentence };
}

/**
 * Navigate to the previous sentence start from a given index.
 *
 * @param tokens - Array of word tokens
 * @param currentIndex - Current word index
 * @returns Index of previous sentence start, or 0 if at beginning
 */
export function getPreviousSentenceStart(
  tokens: WordToken[],
  currentIndex: number
): number {
  const current = tokens.find((t) => t.index === currentIndex);
  if (!current) return 0;

  // If we're at the start of a sentence, go to previous sentence
  const currentSentenceStart = getSentenceStartIndex(
    tokens,
    current.paragraph,
    current.sentence
  );

  if (currentIndex === currentSentenceStart) {
    // Go to previous sentence
    if (current.sentence > 0) {
      return getSentenceStartIndex(
        tokens,
        current.paragraph,
        current.sentence - 1
      );
    } else if (current.paragraph > 0) {
      // Go to last sentence of previous paragraph
      const prevParagraphSentences = getSentenceCount(
        tokens,
        current.paragraph - 1
      );
      return getSentenceStartIndex(
        tokens,
        current.paragraph - 1,
        prevParagraphSentences - 1
      );
    }
    return 0;
  }

  // Otherwise, go to start of current sentence
  return currentSentenceStart;
}

/**
 * Navigate to the next sentence start from a given index.
 *
 * @param tokens - Array of word tokens
 * @param currentIndex - Current word index
 * @returns Index of next sentence start, or last index if at end
 */
export function getNextSentenceStart(
  tokens: WordToken[],
  currentIndex: number
): number {
  const current = tokens.find((t) => t.index === currentIndex);
  if (!current) return tokens.length > 0 ? tokens.length - 1 : 0;

  const sentenceCount = getSentenceCount(tokens, current.paragraph);
  const paragraphCount = getParagraphCount(tokens);

  // Try next sentence in current paragraph
  if (current.sentence < sentenceCount - 1) {
    return getSentenceStartIndex(
      tokens,
      current.paragraph,
      current.sentence + 1
    );
  }

  // Try first sentence of next paragraph
  if (current.paragraph < paragraphCount - 1) {
    return getParagraphStartIndex(tokens, current.paragraph + 1);
  }

  // At the end, return last index
  return tokens.length - 1;
}
