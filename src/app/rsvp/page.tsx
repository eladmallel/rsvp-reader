'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { WordDisplay, ProgressBar, Controls } from '@/components/rsvp';
import styles from './page.module.css';

// Sample text for prototype demonstration
const sampleText = `The quick brown fox jumps over the lazy dog. This is a sample text that demonstrates the RSVP reading experience. Speed reading is a technique that allows readers to consume text at a much faster rate than traditional reading methods. By presenting words one at a time at a fixed focal point, the reader's eyes don't need to move across the page, eliminating saccades and improving reading speed. The Optimal Recognition Point, or ORP, is the letter in each word that the eye naturally focuses on. By highlighting this letter and aligning it to the center of the display, we can further optimize the reading experience. This prototype demonstrates the core RSVP functionality that will be used to read articles from your Readwise Reader library.`;

const words = sampleText.split(/\s+/);

export default function RSVPPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);

  const currentWord = words[currentIndex] || '';

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleRewind = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleForward = useCallback(() => {
    setCurrentIndex((prev) => Math.min(words.length - 1, prev + 1));
  }, []);

  const handleWpmChange = useCallback((newWpm: number) => {
    setWpm(newWpm);
  }, []);

  const handleExit = useCallback(() => {
    // In a real app, this would navigate back
    // For prototype, we just reset
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← Back to Library
        </Link>
        <h1 className={styles.title}>Sample Article</h1>
      </header>

      {/* Main RSVP display area */}
      <main className={styles.main}>
        <div className={styles.displayArea}>
          <WordDisplay word={currentWord} />

          {/* Status indicator */}
          <div className={styles.status}>
            {isPlaying ? (
              <span className={styles.playing}>Playing</span>
            ) : (
              <span className={styles.paused}>Paused</span>
            )}
          </div>
        </div>
      </main>

      {/* Controls and progress */}
      <footer className={styles.footer}>
        <div className={styles.progressContainer}>
          <ProgressBar current={currentIndex + 1} total={words.length} />
        </div>

        <Controls
          isPlaying={isPlaying}
          wpm={wpm}
          onPlayPause={handlePlayPause}
          onRewind={handleRewind}
          onForward={handleForward}
          onWpmChange={handleWpmChange}
          onExit={handleExit}
        />
      </footer>
    </div>
  );
}
