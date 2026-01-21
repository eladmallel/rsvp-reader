/**
 * RSVP (Rapid Serial Visual Presentation) engine utilities
 */

// ORP (Optimal Recognition Point) calculations
export { calculateORP, calculateORPIndex, getORPCharacter, splitWordByORP } from './orp';

// Timing calculations
export {
  calculateBaseTime,
  calculateWordTime,
  createTimingCalculator,
  getPunctuationMultiplier,
  getWordLengthWithoutPunctuation,
  hasClausePunctuation,
  hasSentenceEndingPunctuation,
  isLongWord,
  getLengthAdjustment,
} from './timing';

export type { TimingConfig } from './timing';

// Tokenizer
export {
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

export type { WordToken, TokenizerOptions } from './tokenizer';
