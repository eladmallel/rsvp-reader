import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  current: number;
  total: number;
  showLabels?: boolean;
}

export function ProgressBar({ current, total, showLabels = true }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const progressWidth = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={styles.container}>
      {showLabels && (
        <span className={styles.label}>
          {current} / {total}
        </span>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Reading progress: ${percentage}%`}
      >
        <div className={styles.fill} style={{ width: `${progressWidth}%` }} />
      </div>
      {showLabels && <span className={styles.percentage}>{percentage}%</span>}
    </div>
  );
}
