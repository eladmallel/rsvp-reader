import Image from 'next/image';

import styles from './ArticleCard.module.css';

export interface Article {
  id: string;
  title: string;
  author: string;
  siteName: string;
  readingTime: number; // in minutes
  tags: string[];
  createdAt: string;
  imageUrl?: string;
}

export interface ArticleCardProps {
  article: Article;
  onClick?: (article: Article) => void;
}

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  const handleClick = () => {
    onClick?.(article);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(article);
    }
  };

  const createdDate = new Date(article.createdAt);
  const dateLabel = Number.isNaN(createdDate.getTime())
    ? null
    : createdDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  return (
    <article
      className={styles.card}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`Read ${article.title} by ${article.author}`}
    >
      {article.imageUrl && (
        <div className={styles.imageContainer} aria-hidden="true">
          <Image
            src={article.imageUrl}
            alt=""
            className={styles.image}
            fill
            sizes="100vw"
            unoptimized
          />
        </div>
      )}
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <h3 className={styles.title}>{article.title}</h3>
          <span className={styles.readingTime}>{article.readingTime} min read</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.author}>{article.author}</span>
          <span className={styles.separator} aria-hidden="true">
            ·
          </span>
          <span className={styles.siteName}>{article.siteName}</span>
          {dateLabel && (
            <>
              <span className={styles.separator} aria-hidden="true">
                ·
              </span>
              <span className={styles.date}>{dateLabel}</span>
            </>
          )}
        </div>
        {article.tags.length > 0 && (
          <div className={styles.tags} aria-label="Tags">
            {article.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className={styles.moreTag}>+{article.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
