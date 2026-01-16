/**
 * RTL (Right-to-Left) text detection and utilities
 * Primarily for Hebrew text support
 */

// Unicode ranges for RTL scripts
const RTL_RANGES = [
  // Hebrew: U+0590 to U+05FF
  { start: 0x0590, end: 0x05ff },
  // Hebrew Supplement: U+FB00 to U+FB4F (partial)
  { start: 0xfb1d, end: 0xfb4f },
  // Arabic: U+0600 to U+06FF
  { start: 0x0600, end: 0x06ff },
  // Arabic Supplement: U+0750 to U+077F
  { start: 0x0750, end: 0x077f },
  // Arabic Extended-A: U+08A0 to U+08FF
  { start: 0x08a0, end: 0x08ff },
  // Arabic Presentation Forms-A: U+FB50 to U+FDFF
  { start: 0xfb50, end: 0xfdff },
  // Arabic Presentation Forms-B: U+FE70 to U+FEFF
  { start: 0xfe70, end: 0xfeff },
];

/**
 * Check if a character is from an RTL script
 */
function isRTLChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return RTL_RANGES.some((range) => code >= range.start && code <= range.end);
}

/**
 * Detect if a text string is predominantly RTL
 * Uses a threshold approach - if >50% of alphabetic characters are RTL, the text is considered RTL
 */
export function isRTL(text: string): boolean {
  if (!text || text.length === 0) return false;

  let rtlCount = 0;
  let ltrCount = 0;

  for (const char of text) {
    // Skip non-alphabetic characters (numbers, punctuation, whitespace)
    if (/[\s\d\p{P}]/u.test(char)) continue;

    if (isRTLChar(char)) {
      rtlCount++;
    } else {
      ltrCount++;
    }
  }

  // If no alphabetic characters, default to LTR
  if (rtlCount + ltrCount === 0) return false;

  // RTL if more than half of characters are RTL
  return rtlCount > ltrCount;
}

/**
 * Detect if a single word is RTL
 * More strict than general text detection - requires first letter to be RTL
 */
export function isRTLWord(word: string): boolean {
  if (!word || word.length === 0) return false;

  // Find first letter (skip punctuation/whitespace)
  for (const char of word) {
    if (/[\s\d\p{P}]/u.test(char)) continue;
    return isRTLChar(char);
  }

  return false;
}

/**
 * Get the text direction for a string
 */
export function getTextDirection(text: string): 'ltr' | 'rtl' {
  return isRTL(text) ? 'rtl' : 'ltr';
}

/**
 * Get the text direction for a word
 */
export function getWordDirection(word: string): 'ltr' | 'rtl' {
  return isRTLWord(word) ? 'rtl' : 'ltr';
}
