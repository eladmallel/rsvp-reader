'use client';

/**
 * RSVPPlayer - Complete RSVP reading component (Redesigned)
 *
 * Features the new cockpit-style controls with:
 * - Word display in a centered card with ORP marker
 * - Progress bar with elapsed/remaining time
 * - Play/pause and skip controls
 * - WPM and skip amount steppers
 * - Settings panel for theme/font
 *
 * Supports position persistence: if an articleId is provided, the current
 * reading position will be saved to localStorage and restored when the
 * user returns to the article.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { WordDisplay } from './WordDisplay';
import { Cockpit } from './Cockpit';
import { PlayerSettingsPanel } from './PlayerSettingsPanel';
import { useRSVPPlayer, RSVPPlayerConfig } from './useRSVPPlayer';
import { useReadingPosition } from '@/hooks/useReadingPosition';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
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
  /** Source name (e.g., "X.COM") */
  source?: string;
  /** Initial skip amount in words */
  initialSkipAmount?: number;
  /** Custom class name for the container */
  className?: string;
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

/**
 * RSVPPlayer component - Full RSVP reading experience.
 *
 * @example
 * <RSVPPlayer
 *   text="Hello world. This is a test."
 *   articleId="article-123"
 *   title="My Article"
 *   source="EXAMPLE.COM"
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
  source,
  initialSkipAmount = 3,
  className,
  ...config
}: RSVPPlayerProps) {
  // Only render after hydration to avoid SSR/client mismatches with localStorage
  const [mounted, setMounted] = useState(false);

  // Position persistence
  const { savedPosition, savePosition, clearPosition } = useReadingPosition(articleId);

  // RSVP player state
  const player = useRSVPPlayer(text, {
    ...config,
    initialIndex: savedPosition,
  });

  // Local state
  const [skipAmount, setSkipAmount] = useState(initialSkipAmount);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Set mounted after hydration
  useEffect(() => {
    // Intentional: Set mounted state after hydration to prevent SSR/client mismatches
    // This component uses localStorage (via useReadingPosition) which is only available on client
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Save position when index changes
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

  // Handlers defined before keyboard effect
  const handleSkipBack = useCallback(() => {
    player.goToIndex(Math.max(0, player.currentIndex - skipAmount));
  }, [player, skipAmount]);

  const handleSkipForward = useCallback(() => {
    player.goToIndex(Math.min(player.totalWords - 1, player.currentIndex + skipAmount));
  }, [player, skipAmount]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          handleSkipBack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.setWpm(player.wpm + 10);
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.setWpm(player.wpm - 10);
          break;
        case 'Escape':
          e.preventDefault();
          if (settingsOpen) {
            setSettingsOpen(false);
          } else {
            onExit?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, onExit, settingsOpen, handleSkipBack, handleSkipForward]);

  // Handlers
  const handlePlayPause = useCallback(() => {
    player.togglePlayPause();
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

  // Memoize time calculations to avoid recalculation on every render
  const { elapsedSeconds, remainingSeconds } = useMemo(() => {
    const total = player.totalWords > 0 ? (player.totalWords / player.wpm) * 60 : 0;
    const elapsed = player.totalWords > 0 ? (player.currentIndex / player.wpm) * 60 : 0;
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: Math.max(0, total - elapsed),
    };
  }, [player.totalWords, player.wpm, player.currentIndex]);

  // Show loading state during SSR and initial hydration
  if (!mounted) {
    return (
      <div className={`${styles.container} ${className ?? ''}`}>
        <div className={styles.emptyState}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
      {/* Top bar with back button, settings, and menu */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.topActions}>
            <IconButton onClick={handleExit} aria-label="Back to library">
              <Icon name="chevron-left" />
            </IconButton>
            <div className={styles.actionRight}>
              <IconButton
                onClick={() => setSettingsOpen(!settingsOpen)}
                aria-label="Player settings"
              >
                <Icon name="settings" />
              </IconButton>
              <IconButton aria-label="Article menu">
                <Icon name="more-vertical" />
              </IconButton>
            </div>
          </div>

          {/* Article meta */}
          <div className={styles.articleMeta}>
            {source && <div className={styles.articleSource}>{source}</div>}
            {title && <h1 className={styles.articleTitle}>{title}</h1>}
          </div>
        </div>
      </header>

      {/* Main display area - the stage */}
      <main className={styles.stage}>
        <WordDisplay word={player.currentWord} />
      </main>

      {/* Cockpit with controls */}
      <Cockpit
        progress={player.progress}
        elapsedTime={formatTime(elapsedSeconds)}
        remainingTime={formatTime(remainingSeconds)}
        isPlaying={player.state === 'playing'}
        onPlayPause={handlePlayPause}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        skipAmount={skipAmount}
        wpm={player.wpm}
        onWpmChange={handleWpmChange}
        onSkipAmountChange={setSkipAmount}
        minWpm={config.minWpm}
        maxWpm={config.maxWpm}
      />

      {/* Settings panel */}
      <PlayerSettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

// Re-export hook and types for convenience
export { useRSVPPlayer } from './useRSVPPlayer';
export type { RSVPPlayerConfig, RSVPPlayerReturn, PlayerState } from './useRSVPPlayer';
