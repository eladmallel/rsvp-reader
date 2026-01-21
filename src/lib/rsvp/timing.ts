/**
 * Timing calculation utilities for RSVP reading
 *
 * Calculates how long each word should be displayed based on:
 * - Base WPM (words per minute)
 * - Word length
 * - Punctuation (sentence-ending, clause, etc.)
 */

/**
 * Characters that end sentences and require longer pauses
 */
const SENTENCE_ENDING_PUNCTUATION = ['.', '!', '?', '。', '！', '？'];

/**
 * Characters that indicate clause breaks and require medium pauses
 */
const CLAUSE_PUNCTUATION = [',', ':', ';', '—', '–', '、', '；', '：'];

/**
 * Multiplier for sentence-ending punctuation (3x base time)
 */
const SENTENCE_END_MULTIPLIER = 3;

/**
 * Multiplier for clause punctuation (2x base time)
 */
const CLAUSE_MULTIPLIER = 2;

/**
 * Multiplier for long words (>8 characters) (1.5x base time)
 */
const LONG_WORD_MULTIPLIER = 1.5;

/**
 * Threshold for considering a word "long"
 */
const LONG_WORD_THRESHOLD = 8;

/**
 * Factor for word length adjustment (√length × factor × base)
 */
const LENGTH_FACTOR = 0.04;

/**
 * Calculate the base display time for a given WPM.
 *
 * @param wpm - Words per minute
 * @returns Base time in milliseconds
 *
 * @example
 * calculateBaseTime(300) // 200ms
 * calculateBaseTime(600) // 100ms
 */
export function calculateBaseTime(wpm: number): number {
  if (wpm <= 0) return 0;
  return 60000 / wpm;
}

/**
 * Check if a word ends with sentence-ending punctuation.
 *
 * @param word - The word to check
 * @returns True if the word ends with . ! ? or equivalent
 */
export function hasSentenceEndingPunctuation(word: string): boolean {
  if (!word || word.length === 0) return false;
  const lastChar = word[word.length - 1];
  return SENTENCE_ENDING_PUNCTUATION.includes(lastChar);
}

/**
 * Check if a word ends with clause punctuation.
 *
 * @param word - The word to check
 * @returns True if the word ends with , : ; — or equivalent
 */
export function hasClausePunctuation(word: string): boolean {
  if (!word || word.length === 0) return false;
  const lastChar = word[word.length - 1];
  return CLAUSE_PUNCTUATION.includes(lastChar);
}

/**
 * Get the length of a word excluding trailing punctuation.
 * Used for determining if a word is "long" for timing purposes.
 *
 * @param word - The word to measure
 * @returns Length excluding trailing punctuation
 */
export function getWordLengthWithoutPunctuation(word: string): number {
  if (!word || word.length === 0) return 0;

  // Remove trailing punctuation for length calculation
  const trimmed = word.replace(/[\p{P}\p{S}]+$/u, '');
  return trimmed.length;
}

/**
 * Check if a word is considered "long" (>8 characters excluding punctuation).
 *
 * @param word - The word to check
 * @returns True if word length (without punctuation) > 8
 */
export function isLongWord(word: string): boolean {
  return getWordLengthWithoutPunctuation(word) > LONG_WORD_THRESHOLD;
}

/**
 * Calculate the punctuation multiplier for a word.
 *
 * @param word - The word to check
 * @returns Multiplier (1, 2, or 3) based on punctuation
 */
export function getPunctuationMultiplier(word: string): number {
  if (hasSentenceEndingPunctuation(word)) {
    return SENTENCE_END_MULTIPLIER;
  }
  if (hasClausePunctuation(word)) {
    return CLAUSE_MULTIPLIER;
  }
  return 1;
}

/**
 * Calculate the length-based time adjustment.
 * Longer words get slightly more time: +√(length) × 0.04 × base
 *
 * @param word - The word
 * @param baseTime - Base display time in ms
 * @returns Additional time in ms
 */
export function getLengthAdjustment(word: string, baseTime: number): number {
  const length = getWordLengthWithoutPunctuation(word);
  if (length <= 0) return 0;
  return Math.sqrt(length) * LENGTH_FACTOR * baseTime;
}

/**
 * Calculate the total display time for a word at a given WPM.
 * Combines all timing factors:
 * - Base time from WPM
 * - Punctuation multiplier (sentence end: 3x, clause: 2x)
 * - Long word multiplier (>8 chars: 1.5x)
 * - Length adjustment (+√length × 0.04 × base)
 *
 * @param word - The word to display
 * @param wpm - Words per minute
 * @returns Display time in milliseconds
 *
 * @example
 * // Base word at 300 WPM = 200ms
 * calculateWordTime("hello", 300) // ~209ms (200 + length adjustment)
 *
 * // Sentence end at 300 WPM = 600ms + adjustments
 * calculateWordTime("hello.", 300) // ~627ms
 *
 * // Long word at 300 WPM
 * calculateWordTime("extraordinary", 300) // ~330ms (1.5x + length adjustment)
 */
export function calculateWordTime(word: string, wpm: number): number {
  if (!word || word.length === 0 || wpm <= 0) return 0;

  const baseTime = calculateBaseTime(wpm);
  let time = baseTime;

  // Apply punctuation multiplier
  const punctuationMultiplier = getPunctuationMultiplier(word);
  time *= punctuationMultiplier;

  // Apply long word multiplier (if not already boosted by punctuation)
  if (punctuationMultiplier === 1 && isLongWord(word)) {
    time *= LONG_WORD_MULTIPLIER;
  }

  // Add length adjustment
  time += getLengthAdjustment(word, baseTime);

  return Math.round(time);
}

/**
 * Configuration options for timing calculation.
 */
export interface TimingConfig {
  /** Words per minute (default: 300) */
  wpm?: number;
  /** Multiplier for sentence-ending punctuation (default: 3) */
  sentenceEndMultiplier?: number;
  /** Multiplier for clause punctuation (default: 2) */
  clauseMultiplier?: number;
  /** Multiplier for long words (default: 1.5) */
  longWordMultiplier?: number;
  /** Length factor for adjustment (default: 0.04) */
  lengthFactor?: number;
  /** Threshold for long words (default: 8) */
  longWordThreshold?: number;
}

/**
 * Create a timing calculator with custom configuration.
 * Useful for allowing user customization of reading speed feel.
 *
 * @param config - Custom timing configuration
 * @returns Function that calculates word time
 *
 * @example
 * const fastTiming = createTimingCalculator({ wpm: 600 });
 * fastTiming("hello") // half the time of 300 WPM
 *
 * const gentleTiming = createTimingCalculator({
 *   wpm: 300,
 *   sentenceEndMultiplier: 4, // longer pause at sentences
 * });
 */
export function createTimingCalculator(config: TimingConfig = {}): (word: string) => number {
  const {
    wpm = 300,
    sentenceEndMultiplier = SENTENCE_END_MULTIPLIER,
    clauseMultiplier = CLAUSE_MULTIPLIER,
    longWordMultiplier = LONG_WORD_MULTIPLIER,
    lengthFactor = LENGTH_FACTOR,
    longWordThreshold = LONG_WORD_THRESHOLD,
  } = config;

  return (word: string): number => {
    if (!word || word.length === 0 || wpm <= 0) return 0;

    const baseTime = 60000 / wpm;
    let time = baseTime;

    // Apply punctuation multiplier
    let punctuationMultiplier = 1;
    if (hasSentenceEndingPunctuation(word)) {
      punctuationMultiplier = sentenceEndMultiplier;
    } else if (hasClausePunctuation(word)) {
      punctuationMultiplier = clauseMultiplier;
    }
    time *= punctuationMultiplier;

    // Apply long word multiplier
    const wordLength = getWordLengthWithoutPunctuation(word);
    if (punctuationMultiplier === 1 && wordLength > longWordThreshold) {
      time *= longWordMultiplier;
    }

    // Add length adjustment
    if (wordLength > 0) {
      time += Math.sqrt(wordLength) * lengthFactor * baseTime;
    }

    return Math.round(time);
  };
}
