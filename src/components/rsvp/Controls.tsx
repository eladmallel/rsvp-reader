import styles from './Controls.module.css';

export interface ControlsProps {
  isPlaying: boolean;
  wpm: number;
  onPlayPause: () => void;
  onRewind: () => void;
  onForward: () => void;
  onWpmChange: (wpm: number) => void;
  onExit: () => void;
  minWpm?: number;
  maxWpm?: number;
}

export function Controls({
  isPlaying,
  wpm,
  onPlayPause,
  onRewind,
  onForward,
  onWpmChange,
  onExit,
  minWpm = 100,
  maxWpm = 1000,
}: ControlsProps) {
  return (
    <div className={styles.container}>
      {/* Top row: WPM slider and exit */}
      <div className={styles.topRow}>
        <div className={styles.wpmControl}>
          <label htmlFor="wpm-slider" className={styles.wpmLabel}>
            {wpm} WPM
          </label>
          <input
            id="wpm-slider"
            type="range"
            min={minWpm}
            max={maxWpm}
            step={10}
            value={wpm}
            onChange={(e) => onWpmChange(Number(e.target.value))}
            className={styles.slider}
            aria-label="Words per minute"
          />
        </div>
        <button className={styles.exitButton} onClick={onExit} aria-label="Exit reading mode">
          <ExitIcon />
        </button>
      </div>

      {/* Bottom row: Playback controls */}
      <div className={styles.playbackControls}>
        <button className={styles.controlButton} onClick={onRewind} aria-label="Rewind">
          <RewindIcon />
        </button>

        <button
          className={`${styles.controlButton} ${styles.playButton}`}
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button className={styles.controlButton} onClick={onForward} aria-label="Forward">
          <ForwardIcon />
        </button>
      </div>
    </div>
  );
}

// Simple SVG icons
function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function RewindIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
