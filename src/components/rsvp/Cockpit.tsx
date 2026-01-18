'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { Stepper } from '@/components/ui/Stepper';
import styles from './Cockpit.module.css';

interface CockpitProps {
  // Progress
  progress: number;
  elapsedTime: string;
  remainingTime: string;

  // Playback
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  skipAmount: number;

  // Controls
  wpm: number;
  onWpmChange: (wpm: number) => void;
  onSkipAmountChange: (amount: number) => void;

  // Limits
  minWpm?: number;
  maxWpm?: number;
  minSkip?: number;
  maxSkip?: number;
}

export function Cockpit({
  progress,
  elapsedTime,
  remainingTime,
  isPlaying,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  skipAmount,
  wpm,
  onWpmChange,
  onSkipAmountChange,
  minWpm = 120,
  maxWpm = 900,
  minSkip = 1,
  maxSkip = 20,
}: CockpitProps) {
  return (
    <section className={styles.cockpit}>
      <div className={styles.inner}>
        {/* Progress section */}
        <div className={styles.progressSection}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>{elapsedTime}</span>
            <span className={styles.progressCenter}>{Math.round(progress)}% complete</span>
            <span>{remainingTime}</span>
          </div>
        </div>

        {/* Main controls */}
        <div className={styles.controls}>
          <button
            className={`${styles.controlButton} ${styles.secondary}`}
            type="button"
            onClick={onSkipBack}
            aria-label={`Skip back ${skipAmount} words`}
          >
            <Icon name="chevron-left" size={16} />
            <span className={styles.skipLabel}>{skipAmount}</span>
          </button>

          <button
            className={`${styles.controlButton} ${styles.primary}`}
            type="button"
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={24} />
          </button>

          <button
            className={`${styles.controlButton} ${styles.secondary}`}
            type="button"
            onClick={onSkipForward}
            aria-label={`Skip forward ${skipAmount} words`}
          >
            <Icon name="chevron-right" size={16} />
            <span className={styles.skipLabel}>{skipAmount}</span>
          </button>
        </div>

        {/* Secondary controls */}
        <div className={styles.secondaryControls}>
          <Stepper
            label="WPM"
            value={wpm}
            onChange={onWpmChange}
            min={minWpm}
            max={maxWpm}
            step={10}
          />
          <Stepper
            label="Skip"
            value={skipAmount}
            onChange={onSkipAmountChange}
            min={minSkip}
            max={maxSkip}
            step={1}
            unit="w"
          />
        </div>
      </div>
    </section>
  );
}

export default Cockpit;
