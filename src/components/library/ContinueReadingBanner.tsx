'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './ContinueReadingBanner.module.css';

export interface ContinueReadingData {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

export interface ContinueReadingBannerProps {
  article: ContinueReadingData;
  onContinue: (article: ContinueReadingData) => void;
  onDismiss?: () => void;
}

export function ContinueReadingBanner({
  article,
  onContinue,
  onDismiss,
}: ContinueReadingBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleClick = () => {
    onContinue(article);
  };

  // Get first letter for avatar fallback
  const avatarLetter = article.title.charAt(0).toUpperCase();

  return (
    <div className={styles.banner} onClick={handleClick} role="button" tabIndex={0}>
      <div className={styles.avatar}>
        {article.thumbnailUrl ? (
          <Image
            src={article.thumbnailUrl}
            alt=""
            width={36}
            height={36}
            className={styles.avatarImage}
            unoptimized
          />
        ) : (
          <span className={styles.avatarFallback}>{avatarLetter}</span>
        )}
      </div>
      <div className={styles.content}>
        <span className={styles.label}>Continue:</span>
        <span className={styles.title}>{article.title}</span>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        aria-label="Dismiss"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
