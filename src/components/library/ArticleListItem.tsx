import { useCallback, useMemo } from 'react';
import Image from 'next/image';

import { MoreOptionsHorizontalIcon } from '@/components/ui/icons';
import styles from './ArticleListItem.module.css';

export interface ArticleListItemData {
  id: string;
  title: string;
  author: string;
  source: string;
  sourceName: string;
  readingTime: number;
  tags: string[];
  createdAt: string;
  preview?: string;
  imageUrl?: string;
  isUnread?: boolean;
}

export interface ArticleListItemProps {
  article: ArticleListItemData;
  onClick?: (article: ArticleListItemData) => void;
  onMenuClick?: (article: ArticleListItemData, event: React.MouseEvent) => void;
}

function getSourceIcon(sourceName: string): string {
  const name = sourceName.toLowerCase();
  if (name.includes('twitter') || name.includes('x.com')) return 'X';
  if (name.includes('substack')) return 'S';
  if (name.includes('medium')) return 'M';
  if (name.includes('github')) return 'G';
  if (name.includes('hacker news') || name.includes('ycombinator')) return 'Y';
  if (name.includes('reddit')) return 'R';
  if (name.includes('verge')) return 'V';
  return sourceName.charAt(0).toUpperCase();
}

export function ArticleListItem({ article, onClick, onMenuClick }: ArticleListItemProps) {
  const handleClick = useCallback(() => {
    onClick?.(article);
  }, [onClick, article]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(article);
      }
    },
    [onClick, article]
  );

  const handleMenuClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMenuClick?.(article, e);
    },
    [onMenuClick, article]
  );

  const sourceIcon = getSourceIcon(article.sourceName);
  const displaySource = article.sourceName.toUpperCase();

  // Format time display - memoized to avoid recreating Date objects on every render
  const timeDisplay = useMemo(() => {
    const createdDate = new Date(article.createdAt);
    const now = new Date();
    const isToday = createdDate.toDateString() === now.toDateString();
    const isYesterday =
      new Date(now.getTime() - 86400000).toDateString() === createdDate.toDateString();

    if (isToday) {
      return createdDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    if (isYesterday) {
      return 'Yesterday';
    }
    return createdDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, [article.createdAt]);

  return (
    <article
      className={styles.item}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`Read ${article.title} by ${article.author}`}
    >
      {article.isUnread && <div className={styles.unreadIndicator} aria-label="Unread" />}

      <div className={styles.main}>
        <div className={styles.sourceRow}>
          <div className={styles.sourceIcon} aria-hidden="true">
            {sourceIcon}
          </div>
          <span className={styles.sourceName}>{displaySource}</span>
          <button
            type="button"
            className={styles.overflowButton}
            onClick={handleMenuClick}
            aria-label="More options"
          >
            {MoreOptionsHorizontalIcon}
          </button>
        </div>

        <h2 className={styles.title}>
          {article.title}
          {article.tags.slice(0, 2).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </h2>

        {article.preview && (
          <p className={styles.preview}>
            <span className={styles.timeInline}>{timeDisplay}</span>
            <span className={styles.separator} aria-hidden="true">
              {' '}
              ·{' '}
            </span>
            {article.preview}
          </p>
        )}

        <div className={styles.meta}>
          <span className={styles.author}>{article.author}</span>
          <span className={styles.separator} aria-hidden="true">
            ·
          </span>
          <span className={styles.readingTime}>{article.readingTime} min</span>
        </div>
      </div>

      {article.imageUrl && (
        <div className={styles.thumbnail}>
          <Image
            src={article.imageUrl}
            alt=""
            fill
            sizes="80px"
            className={styles.thumbnailImage}
            unoptimized
          />
        </div>
      )}
    </article>
  );
}
