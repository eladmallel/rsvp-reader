import { isRTLWord } from '@/lib/rtl';
import { calculateORPIndex } from '@/lib/rsvp';
import styles from './WordDisplay.module.css';

export interface WordDisplayProps {
  word: string;
  orpIndex?: number; // If not provided, calculated automatically
}

/**
 * Fixed width for all words (in characters) to ensure ORP stays at same position.
 * Based on speedread/Spritz approach: pad words to fixed length with invisible chars.
 */
const FIXED_WORD_WIDTH = 22;

/**
 * Position where the ORP character should appear (0-indexed)
 */
const ORP_POSITION = 10;

/**
 * Pads a word to fixed width with invisible dots, keeping the ORP at center position.
 * This ensures the highlighted letter always appears at the same horizontal position.
 *
 * Based on the algorithm from the original Spritz/speedread implementation.
 */
function padWordWithORP(
  word: string,
  orpIndex: number
): {
  left: string;
  orp: string;
  right: string;
} {
  const length = word.length;
  const leftPart = word.slice(0, orpIndex);
  const orpChar = word[orpIndex] || '';
  const rightPart = word.slice(orpIndex + 1);

  // Calculate how many dots to add on each side to position ORP at center
  // ORP should end up at position ORP_POSITION (10) in the 22-char string
  const dotsBeforeORP = ORP_POSITION - leftPart.length;
  const dotsAfterORP = FIXED_WORD_WIDTH - ORP_POSITION - 1 - rightPart.length;

  // For very long words, we may need negative padding - clamp to 0
  const leftDots = Math.max(0, dotsBeforeORP);
  const rightDots = Math.max(0, dotsAfterORP);

  const paddedLeft = '.'.repeat(leftDots) + leftPart;
  const paddedRight = rightPart + '.'.repeat(rightDots);

  return {
    left: paddedLeft,
    orp: orpChar,
    right: paddedRight,
  };
}

/**
 * Renders invisible dots as bullet points
 */
function renderWithInvisibleDots(text: string) {
  return text.split('').map((char, i) => {
    if (char === '.') {
      return (
        <span key={i} className={styles.invisible}>
          .
        </span>
      );
    }
    return char;
  });
}

export function WordDisplay({ word, orpIndex }: WordDisplayProps) {
  if (!word) {
    return (
      <div className={styles.container}>
        <div className={styles.wordWrapper}>
          <div className={styles.word}>
            <span className={styles.placeholder}>Ready</span>
          </div>
          <div className={styles.focusLine} aria-hidden="true" />
        </div>
      </div>
    );
  }

  const isRtl = isRTLWord(word);
  const index = orpIndex ?? calculateORPIndex(word.length, isRtl);
  const { left, orp, right } = padWordWithORP(word, index);

  return (
    <div className={styles.container}>
      <div className={styles.wordWrapper}>
        <div
          className={`${styles.word} ${isRtl ? styles.rtl : ''}`}
          dir={isRtl ? 'rtl' : 'ltr'}
          aria-label={`Current word: ${word}`}
          aria-live="polite"
        >
          <span className={styles.left}>{renderWithInvisibleDots(left)}</span>
          <span className={styles.orp}>{orp}</span>
          <span className={styles.right}>{renderWithInvisibleDots(right)}</span>
        </div>
        <div className={styles.focusLine} aria-hidden="true" />
      </div>
    </div>
  );
}
