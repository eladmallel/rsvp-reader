'use client';

/**
 * RSVPPlayer - Complete RSVP reading component
 *
 * Combines WordDisplay, Controls, and ProgressBar into a full-featured
 * RSVP reading experience with automatic playback.
 *
 * Supports position persistence: if an articleId is provided, the current
 * reading position will be saved to localStorage and restored when the
 * user returns to the article.
 */

import { useCallback, useEffect } from 'react';
import { WordDisplay } from './WordDisplay';
import { Controls } from './Controls';
import { ProgressBar } from './ProgressBar';
import { useRSVPPlayer, RSVPPlayerConfig, PlayerState } from './useRSVPPlayer';
import { useReadingPosition } from '@/hooks/useReadingPosition';
import styles from './RSVPPlayer.module.css';

export interface RSVPPlayerProps extends RSVPPlayerConfig {
  /** Text content to read */
  text: string;
  /** Article ID for position persistence (null disables persistence) */
  articleId?: string | null;
  /** Callback when exit button is clicked */
  onExit?: () => void;
  /** Optional title to display */
  title?: string;
  /** Whether to show progress labels */
  showProgressLabels?: boolean;
  /** Custom class name for the container */
  className?: string;
}

/**
 * State indicator component
 */
function StateIndicator({ state }: { state: PlayerState }) {
  const labels: Record<PlayerState, string> = {
    idle: 'Ready',
    playing: 'Playing',
    paused: 'Paused',
    finished: 'Finished',
  };

  return (
    <div className={styles.stateIndicator} aria-live="polite">
      <span className={`${styles.state} ${styles[state]}`}>{labels[state]}</span>
    </div>
  );
}

/**
 * RSVPPlayer component - Full RSVP reading experience.
 *
 * @example
 * <RSVPPlayer
 *   text="Hello world. This is a test."
 *   articleId="article-123"
 *   initialWpm={300}
 *   onComplete={() => console.log("Done!")}
 *   onExit={() => router.push("/library")}
 * />
 */
export function RSVPPlayer({
  text,
  articleId = null,
  onExit,
  title,
  showProgressLabels = true,
  className,
  ...config
}: RSVPPlayerProps) {
  // Position persistence - savedPosition is read synchronously from localStorage on mount
  const { savedPosition, savePosition, clearPosition } = useReadingPosition(articleId);

  // RSVP player state - savedPosition is used as initialIndex only on first render
  // The hook internally handles clamping to valid range
  const player = useRSVPPlayer(text, {
    ...config,
    initialIndex: savedPosition,
  });

  // Save position when index changes (debounced by useReadingPosition)
  useEffect(() => {
    if (player.state === 'playing' || player.state === 'paused') {
      savePosition(player.currentIndex);
    }
  }, [player.currentIndex, player.state, savePosition]);

  // Clear position when finished
  useEffect(() => {
    if (player.state === 'finished') {
      clearPosition();
    }
  }, [player.state, clearPosition]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          player.togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            player.previousSentence();
          } else {
            player.previousWord();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            player.nextSentence();
          } else {
            player.nextWord();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.setWpm(player.wpm + 50);
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.setWpm(player.wpm - 50);
          break;
        case 'Escape':
          e.preventDefault();
          onExit?.();
          break;
        case 'Home':
          e.preventDefault();
          player.reset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, onExit]);

  const handlePlayPause = useCallback(() => {
    player.togglePlayPause();
  }, [player]);

  const handleRewind = useCallback(() => {
    player.previousWord();
  }, [player]);

  const handleForward = useCallback(() => {
    player.nextWord();
  }, [player]);

  const handleWpmChange = useCallback(
    (newWpm: number) => {
      player.setWpm(newWpm);
    },
    [player]
  );

  const handleExit = useCallback(() => {
    player.pause();
    onExit?.();
  }, [player, onExit]);

  // Empty text state
  if (player.totalWords === 0) {
    return (
      <div className={`${styles.container} ${className ?? ''}`}>
        <div className={styles.emptyState}>
          <p>No text to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      {/* Header with title */}
      {title && (
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
        </header>
      )}

      {/* Main display area */}
      <main className={styles.main}>
        <div className={styles.displayArea}>
          <WordDisplay word={player.currentWord} />
          <StateIndicator state={player.state} />
        </div>
      </main>

      {/* Footer with progress and controls */}
      <footer className={styles.footer}>
        <div className={styles.progressContainer}>
          <ProgressBar
            current={player.currentIndex + 1}
            total={player.totalWords}
            showLabels={showProgressLabels}
          />
        </div>

        <Controls
          isPlaying={player.state === 'playing'}
          wpm={player.wpm}
          onPlayPause={handlePlayPause}
          onRewind={handleRewind}
          onForward={handleForward}
          onWpmChange={handleWpmChange}
          onExit={handleExit}
          minWpm={config.minWpm}
          maxWpm={config.maxWpm}
        />

        {/* Keyboard hint */}
        <div className={styles.keyboardHint}>
          <span>Space: Play/Pause</span>
          <span>←/→: Word</span>
          <span>↑/↓: Speed</span>
          <span>Esc: Exit</span>
        </div>
      </footer>
    </div>
  );
}

// Re-export hook and types for convenience
export { useRSVPPlayer } from './useRSVPPlayer';
export type { RSVPPlayerConfig, RSVPPlayerReturn, PlayerState } from './useRSVPPlayer';
