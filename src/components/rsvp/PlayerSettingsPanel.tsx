'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './PlayerSettingsPanel.module.css';

interface PlayerSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerSettingsPanel({ isOpen, onClose }: PlayerSettingsPanelProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop to close panel when clicking outside */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <aside className={styles.panel} aria-label="Player settings">
        <div className={styles.header}>Player Settings</div>

        <div className={styles.row}>
          <span className={styles.label}>Theme</span>
          <button className={styles.pillButton} type="button" onClick={toggleTheme}>
            {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Font</span>
          <button className={styles.pillButton} type="button">
            Monospace
          </button>
        </div>
      </aside>
    </>
  );
}

export default PlayerSettingsPanel;
