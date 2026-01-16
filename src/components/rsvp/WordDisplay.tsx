import styles from './WordDisplay.module.css';

export interface WordDisplayProps {
  word: string;
  orpIndex?: number; // If not provided, calculated automatically
}

/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * Based on speedread's lookup table approach.
 */
export function calculateORPIndex(wordLength: number): number {
  if (wordLength <= 0) return 0;
  if (wordLength > 13) return 4;

  const orpTable = [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];
  return orpTable[wordLength] || 0;
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

  const index = orpIndex ?? calculateORPIndex(word.length);
  const leftPart = word.slice(0, index);
  const orpChar = word[index] || '';
  const rightPart = word.slice(index + 1);

  return (
    <div className={styles.container}>
      <div className={styles.word} aria-label={`Current word: ${word}`}>
        <span className={styles.left}>{leftPart}</span>
        <span className={styles.orp}>{orpChar}</span>
        <span className={styles.right}>{rightPart}</span>
      </div>
      <div className={styles.focusLine} aria-hidden="true" />
    </div>
  );
}
