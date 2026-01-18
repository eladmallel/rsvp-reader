'use client';

import React from 'react';
import styles from './TopBar.module.css';

interface TopBarProps {
  children?: React.ReactNode;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
  title?: string;
  subtitle?: string;
  centerContent?: React.ReactNode;
  className?: string;
}

export function TopBar({
  children,
  leftAction,
  rightActions,
  title,
  subtitle,
  centerContent,
  className = '',
}: TopBarProps) {
  return (
    <header className={`${styles.topBar} ${className}`}>
      <div className={styles.inner}>
        {children || (
          <>
            <div className={styles.topActions}>
              <div className={styles.actionLeft}>{leftAction}</div>
              <div className={styles.actionRight}>{rightActions}</div>
            </div>
            {centerContent ||
              (title && (
                <div className={styles.centerContent}>
                  {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
                  <h1 className={styles.title}>{title}</h1>
                </div>
              ))}
          </>
        )}
      </div>
    </header>
  );
}

export default TopBar;
