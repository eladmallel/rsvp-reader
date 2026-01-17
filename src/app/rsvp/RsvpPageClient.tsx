'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RSVPPlayer } from '@/components/rsvp';
import { ThemeToggle } from '@/components/ui';
import styles from './page.module.css';

interface ArticleContent {
  id: string;
  title: string;
  author: string | null;
  content?: string | null;
  htmlContent?: string | null;
  wordCount: number | null;
}

interface ArticleResponse {
  document?: ArticleContent;
  error?: string;
}

// Sample text for when no article is loaded (demo mode)
const sampleText = `The quick brown fox jumps over the lazy dog. This is a sample text that demonstrates the RSVP reading experience. Speed reading is a technique that allows readers to consume text at a much faster rate than traditional reading methods. By presenting words one at a time at a fixed focal point, the reader's eyes don't need to move across the page, eliminating saccades and improving reading speed. The Optimal Recognition Point, or ORP, is the letter in each word that the eye naturally focuses on. By highlighting this letter and aligning it to the center of the display, we can further optimize the reading experience. This prototype demonstrates the core RSVP functionality that will be used to read articles from your Readwise Reader library.`;

export default function RsvpPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const articleId = searchParams.get('id');

  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch article content
  const fetchArticle = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reader/documents/${id}?content=true`);
      const data: ArticleResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch article');
      }

      if (!data.document) {
        throw new Error('Article not found');
      }

      setArticle(data.document);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch article when ID changes
  useEffect(() => {
    if (articleId) {
      fetchArticle(articleId);
    }
  }, [articleId, fetchArticle]);

  const handleExit = useCallback(() => {
    router.push('/');
  }, [router]);

  // Get text content - use article content, fall back to HTML stripped of tags, or sample
  const getTextContent = (): string => {
    if (article) {
      // Prefer plain text content if available
      if (article.content && article.content.trim()) {
        return article.content;
      }
      // Fall back to stripped HTML
      if (article.htmlContent) {
        // Strip HTML tags to get plain text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = article.htmlContent;
        return tempDiv.textContent || tempDiv.innerText || sampleText;
      }
    }
    return sampleText;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backLink}>
              ← Back to Library
            </Link>
            <h1 className={styles.title}>Loading...</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className={styles.main}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading article...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backLink}>
              ← Back to Library
            </Link>
            <h1 className={styles.title}>Error</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className={styles.main}>
          <div className={styles.errorState}>
            <p>Error: {error}</p>
            <button onClick={() => router.refresh()} className={styles.retryButton}>
              Try Again
            </button>
            <Link href="/" className={styles.backLinkButton}>
              Back to Library
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Demo mode when no article ID provided
  const isDemo = !articleId;
  const title = article?.title || (isDemo ? 'RSVP Demo' : 'Sample Article');
  const text = getTextContent();

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backLink}>
            ← Back to Library
          </Link>
          <h1 className={styles.title}>{title}</h1>
          {article?.author && <span className={styles.author}>by {article.author}</span>}
        </div>
        <ThemeToggle />
      </header>

      {/* RSVP Player */}
      <RSVPPlayer
        text={text}
        onExit={handleExit}
        initialWpm={300}
        className={styles.playerContainer}
      />
    </div>
  );
}
