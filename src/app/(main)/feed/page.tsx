'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArticleListItem,
  SubTabs,
  feedSubTabs,
  type ArticleListItemData,
} from '@/components/library';
import { MenuIcon, AddIcon, MoreOptionsIcon, RSSIcon } from '@/components/ui/icons';
import styles from './page.module.css';

interface DocumentFromApi {
  id: string;
  title: string | null;
  author: string | null;
  source: string | null;
  siteName: string | null;
  url: string;
  sourceUrl: string | null;
  category: string;
  location: string | null;
  tags: string[];
  wordCount: number | null;
  readingProgress: number;
  summary: string | null;
  imageUrl: string | null;
  publishedDate: string | null;
  createdAt: string;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
}

interface DocumentsResponse {
  documents?: DocumentFromApi[];
  nextCursor?: string | null;
  count?: number;
  error?: string;
}

interface ConnectionResponse {
  connected: boolean;
  error?: string;
}

// Convert API document to ArticleListItemData
function documentToArticleListItem(doc: DocumentFromApi): ArticleListItemData {
  const readingTime = doc.wordCount ? Math.ceil(doc.wordCount / 200) : 5;
  return {
    id: doc.id,
    title: doc.title ?? 'Untitled',
    author: doc.author || doc.siteName || 'Unknown',
    source: doc.source || '',
    sourceName: doc.siteName || doc.source || 'Unknown',
    readingTime,
    tags: doc.tags || [],
    createdAt: doc.createdAt,
    preview: doc.summary || undefined,
    imageUrl: doc.imageUrl || undefined,
    // Use firstOpenedAt for seen/unseen classification (not readingProgress)
    // A document is "unseen" if it has never been opened
    isUnread: doc.firstOpenedAt === null,
  };
}

export default function FeedPage() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState('unseen');

  // API state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Data from API
  const [articles, setArticles] = useState<ArticleListItemData[]>([]);

  // Check if Reader is connected
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/connect-reader');
      const data: ConnectionResponse = await response.json();
      setIsConnected(data.connected);
      return data.connected;
    } catch {
      setIsConnected(false);
      return false;
    }
  }, []);

  // Fetch documents from API
  const fetchDocuments = useCallback(async (seen: boolean, signal?: AbortSignal) => {
    try {
      // Feed items use location=feed, and we filter by reading progress
      const params = new URLSearchParams({ location: 'feed', pageSize: '50' });
      const response = await fetch(`/api/reader/documents?${params}`, {
        signal,
      });
      const data: DocumentsResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      const allArticles = (data.documents || []).map(documentToArticleListItem);

      // Filter by seen/unseen (using isUnread which is based on readingProgress)
      if (seen) {
        return allArticles.filter((a) => !a.isUnread);
      } else {
        return allArticles.filter((a) => a.isUnread);
      }
    } catch (err) {
      // Ignore AbortError - expected on cleanup
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      console.error('Error fetching feed documents:', err);
      return [];
    }
  }, []);

  // Initial connection check
  useEffect(() => {
    async function loadConnection() {
      const connected = await checkConnection();
      if (!connected) {
        setIsLoading(false);
      }
    }

    loadConnection();
  }, [checkConnection]);

  // Load documents when connected or tab changes
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const controller = new AbortController();

    async function loadDocuments() {
      setIsLoading(true);
      setError(null);

      try {
        const seen = activeSubTab === 'seen';
        const docs = await fetchDocuments(seen, controller.signal);
        setArticles(docs);
      } catch (err) {
        // Ignore AbortError - expected on cleanup
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadDocuments();

    return () => {
      controller.abort();
    };
  }, [fetchDocuments, isConnected, activeSubTab]);

  const handleArticleClick = (article: ArticleListItemData) => {
    router.push(`/rsvp?id=${article.id}`);
  };

  const handleMenuClick = (article: ArticleListItemData) => {
    // Future: implement overflow menu
    console.log('Menu clicked for:', article.id);
  };

  // Get display title and count for current tab
  const tabInfo = useMemo(() => {
    const labels: Record<string, string> = {
      unseen: 'Unseen',
      seen: 'Seen',
    };
    return {
      title: labels[activeSubTab] || 'Feed',
      count: articles.length,
    };
  }, [activeSubTab, articles.length]);

  // Not connected state
  if (isConnected === false) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <button className={styles.iconButton} type="button" aria-label="Menu">
              {MenuIcon}
            </button>
          </div>
          <div className={styles.pageTitle}>
            <h1 className={styles.title}>Feed</h1>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.connectPrompt}>
            <div className={styles.connectIcon}>📰</div>
            <h2>Connect Your Reader Account</h2>
            <p>Connect your Readwise Reader account to see your RSS feed articles.</p>
            <Link href="/auth/connect-reader" className={styles.connectButton}>
              Connect Readwise Reader
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  if (isLoading && articles.length === 0) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <button className={styles.iconButton} type="button" aria-label="Menu">
              {MenuIcon}
            </button>
          </div>
          <div className={styles.pageTitle}>
            <h1 className={styles.title}>Feed</h1>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your feed...</p>
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
          <div className={styles.headerTop}>
            <button className={styles.iconButton} type="button" aria-label="Menu">
              {MenuIcon}
            </button>
          </div>
          <div className={styles.pageTitle}>
            <h1 className={styles.title}>Feed</h1>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.errorState}>
            <p>Error: {error}</p>
            <button onClick={() => router.refresh()} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.iconButton} type="button" aria-label="Menu">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className={styles.actionRight}>
            <button className={styles.iconButton} type="button" aria-label="Add feed">
              {AddIcon}
            </button>
            <button className={styles.iconButton} type="button" aria-label="More options">
              {MoreOptionsIcon}
            </button>
          </div>
        </div>
        <div className={styles.pageTitle}>
          <h1 className={styles.title}>{tabInfo.title}</h1>
          <span className={styles.count}>{tabInfo.count}</span>
        </div>
      </header>

      <div className={styles.subTabsContainer}>
        <SubTabs tabs={feedSubTabs} activeTab={activeSubTab} onTabChange={setActiveSubTab} />
      </div>

      <main className={styles.main}>
        {articles.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>{RSSIcon}</div>
            <p className={styles.emptyTitle}>
              {activeSubTab === 'unseen' ? 'All caught up!' : 'No seen articles'}
            </p>
            <p className={styles.emptyDescription}>
              {activeSubTab === 'unseen'
                ? "You've read all your feed articles. Check back later for new content."
                : "Articles you've read will appear here."}
            </p>
          </div>
        ) : (
          <div className={styles.articleList}>
            {articles.map((article) => (
              <ArticleListItem
                key={article.id}
                article={article}
                onClick={handleArticleClick}
                onMenuClick={handleMenuClick}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
