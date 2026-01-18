import { isRTLWord } from '@/lib/rtl';
import { calculateORPIndex } from '@/lib/rsvp';
import styles from './WordDisplay.module.css';

export interface WordDisplayProps {
  word: string;
  orpIndex?: number; // If not provided, calculated automatically
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
  const leftPart = word.slice(0, index);
  const orpChar = word[index] || '';
  const rightPart = word.slice(index + 1);

  return (
    <div className={styles.container}>
      <div className={styles.wordWrapper}>
        <div
          className={`${styles.word} ${isRtl ? styles.rtl : ''}`}
          dir={isRtl ? 'rtl' : 'ltr'}
          aria-label={`Current word: ${word}`}
          aria-live="polite"
        >
          <span className={styles.left}>{leftPart}</span>
          <span className={styles.orp}>{orpChar}</span>
          <span className={styles.right}>{rightPart}</span>
        </div>
        <div className={styles.focusLine} aria-hidden="true" />
      </div>
    </div>
  );
}
