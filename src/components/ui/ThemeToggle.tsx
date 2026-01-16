'use client';

import { useTheme } from '@/contexts/ThemeContext';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
  /** Show theme options dropdown instead of simple toggle */
  showOptions?: boolean;
  /** Additional CSS class */
  className?: string;
}

// Sun icon for light mode
function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

// Moon icon for dark mode
function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// Monitor icon for system preference
function MonitorIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export function ThemeToggle({ showOptions = false, className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (showOptions) {
    return (
      <div className={`${styles.optionsContainer} ${className}`}>
        <span className={styles.label}>Theme</span>
        <div className={styles.options} role="radiogroup" aria-label="Theme selection">
          <button
            type="button"
            className={`${styles.option} ${theme === 'light' ? styles.active : ''}`}
            onClick={() => setTheme('light')}
            role="radio"
            aria-checked={theme === 'light'}
            title="Light mode"
          >
            <SunIcon />
            <span className={styles.optionLabel}>Light</span>
          </button>
          <button
            type="button"
            className={`${styles.option} ${theme === 'dark' ? styles.active : ''}`}
            onClick={() => setTheme('dark')}
            role="radio"
            aria-checked={theme === 'dark'}
            title="Dark mode"
          >
            <MoonIcon />
            <span className={styles.optionLabel}>Dark</span>
          </button>
          <button
            type="button"
            className={`${styles.option} ${theme === 'system' ? styles.active : ''}`}
            onClick={() => setTheme('system')}
            role="radio"
            aria-checked={theme === 'system'}
            title="System preference"
          >
            <MonitorIcon />
            <span className={styles.optionLabel}>System</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className={`${styles.icon} ${resolvedTheme === 'light' ? styles.visible : ''}`}>
        <SunIcon />
      </span>
      <span className={`${styles.icon} ${resolvedTheme === 'dark' ? styles.visible : ''}`}>
        <MoonIcon />
      </span>
    </button>
  );
}

export default ThemeToggle;
