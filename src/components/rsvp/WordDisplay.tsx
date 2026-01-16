import { isRTLWord } from '@/lib/rtl';
import styles from './WordDisplay.module.css';

export interface WordDisplayProps {
  word: string;
  orpIndex?: number; // If not provided, calculated automatically
}

/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * Based on speedread's lookup table approach.
 * For RTL text, the ORP is calculated from the right side.
 */
export function calculateORPIndex(wordLength: number, isRtl: boolean = false): number {
  if (wordLength <= 0) return 0;
  if (wordLength > 13) return isRtl ? wordLength - 5 : 4;

  const orpTable = [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];
  const orpOffset = orpTable[wordLength] || 0;

  // For RTL, count from the right
  return isRtl ? wordLength - 1 - orpOffset : orpOffset;
}

export function WordDisplay({ word, orpIndex }: WordDisplayProps) {
  if (!word) {
    return (
      <div className={styles.container}>
        <div className={styles.word}>
          <span className={styles.placeholder}>Ready</span>
        </div>
      </div>
    );
  }

  const isRtl = isRTLWord(word);
  const index = orpIndex ?? calculateORPIndex(word.length, isRtl);
  const leftPart = word.slice(0, index);
  const orpChar = word[index] || '';
  const rightPart = word.slice(index + 1);

  return (
    <div className={styles.container}>
      <div
        className={`${styles.word} ${isRtl ? styles.rtl : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
        aria-label={`Current word: ${word}`}
      >
        <span className={styles.left}>{leftPart}</span>
        <span className={styles.orp}>{orpChar}</span>
        <span className={styles.right}>{rightPart}</span>
      </div>
      <div className={styles.focusLine} aria-hidden="true" />
    </div>
  );
}
