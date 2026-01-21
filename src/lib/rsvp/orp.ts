/**
 * ORP (Optimal Recognition Point) calculation utilities
 *
 * Based on research from speedread and OpenSpritz:
 * - The ORP is the character that the eye naturally focuses on when reading
 * - For most words, this is slightly left of center
 * - Aligning words by their ORP reduces eye movement and increases reading speed
 */

/**
 * Lookup table for ORP offset by word length (0-13 characters)
 * Based on speedread's approach: https://github.com/pasky/speedread
 */
const ORP_TABLE = [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];

/**
 * Maximum ORP offset for very long words (>13 characters)
 */
const MAX_ORP_OFFSET = 4;

/**
 * Calculate the ORP offset for a given word length.
 * The offset is the number of characters from the start of the word
 * to the optimal recognition point.
 *
 * @param wordLength - Length of the word
 * @returns ORP offset (0-4)
 *
 * @example
 * calculateORP(1)  // 0 - single char, focus on it
 * calculateORP(5)  // 1 - "Hello" -> focus on 'e' (index 1)
 * calculateORP(7)  // 2 - "Reading" -> focus on 'a' (index 2)
 * calculateORP(20) // 4 - very long words cap at offset 4
 */
export function calculateORP(wordLength: number): number {
  if (wordLength <= 0) return 0;
  if (wordLength > 13) return MAX_ORP_OFFSET;
  return ORP_TABLE[wordLength] ?? 0;
}

/**
 * Calculate the character index for ORP highlighting.
 * For LTR text, this is the same as the ORP offset.
 * For RTL text, the index is calculated from the right side of the word.
 *
 * @param wordLength - Length of the word
 * @param isRtl - Whether the word is right-to-left (Hebrew, Arabic, etc.)
 * @returns Character index (0-based) for ORP highlighting
 *
 * @example
 * // LTR examples
 * calculateORPIndex(5, false)  // 1 - "Hello" -> 'e' at index 1
 * calculateORPIndex(7, false)  // 2 - "Reading" -> 'a' at index 2
 *
 * // RTL examples (Hebrew reads right-to-left)
 * calculateORPIndex(4, true)   // 2 - "שלום" -> 'ו' at index 2 (from left, but visually from right)
 */
export function calculateORPIndex(wordLength: number, isRtl: boolean = false): number {
  if (wordLength <= 0) return 0;

  const orpOffset = calculateORP(wordLength);

  if (isRtl) {
    // For RTL, count from the right
    // wordLength - 1 gives us the last index, then subtract the offset
    return wordLength - 1 - orpOffset;
  }

  return orpOffset;
}

/**
 * Get the ORP character from a word.
 * Useful for highlighting the focal point of a word.
 *
 * @param word - The word to get the ORP character from
 * @param isRtl - Whether the word is right-to-left
 * @returns The ORP character, or empty string if word is empty
 *
 * @example
 * getORPCharacter("Hello")     // "e"
 * getORPCharacter("Reading")   // "a"
 * getORPCharacter("שלום", true) // "ו"
 */
export function getORPCharacter(word: string, isRtl: boolean = false): string {
  if (!word || word.length === 0) return '';

  const index = calculateORPIndex(word.length, isRtl);
  return word[index] ?? '';
}

/**
 * Split a word into three parts: before ORP, ORP character, after ORP.
 * Useful for rendering with ORP highlighting.
 *
 * @param word - The word to split
 * @param isRtl - Whether the word is right-to-left
 * @returns Object with left, orp, and right parts
 *
 * @example
 * splitWordByORP("Reading")
 * // { left: "Re", orp: "a", right: "ding" }
 *
 * splitWordByORP("שלום", true)
 * // { left: "של", orp: "ו", right: "ם" }
 */
export function splitWordByORP(
  word: string,
  isRtl: boolean = false
): { left: string; orp: string; right: string } {
  if (!word || word.length === 0) {
    return { left: '', orp: '', right: '' };
  }

  const index = calculateORPIndex(word.length, isRtl);
  return {
    left: word.slice(0, index),
    orp: word[index] ?? '',
    right: word.slice(index + 1),
  };
}
