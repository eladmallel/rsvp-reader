'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArticleListItem,
  SubTabs,
  librarySubTabs,
  type ArticleListItemData,
} from '@/components/library';
import { DropdownMenu } from '@/components/ui';
import type { SyncStatus, SyncTriggerResponse, SyncErrorResponse } from '@/types/sync';
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

// Map our sub-tab IDs to Readwise location parameter
const subTabToLocation: Record<string, string> = {
  new: 'new',
  later: 'later',
  archive: 'archive',
};

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
    isUnread: doc.readingProgress === 0,
  };
}

export default function LibraryPage() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState('new');

  // API state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Data from API
  const [articles, setArticles] = useState<ArticleListItemData[]>([]);

  // Dropdown menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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
  const fetchDocuments = useCallback(async (location: string) => {
    try {
      const params = new URLSearchParams({ location, pageSize: '50' });
      const response = await fetch(`/api/reader/documents?${params}`);
      const data: DocumentsResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      return (data.documents || []).map(documentToArticleListItem);
    } catch (err) {
      console.error(`Error fetching ${location} documents:`, err);
      return [];
    }
  }, []);

  // Trigger manual Readwise sync
  const handleSyncTrigger = useCallback(async () => {
    setIsMenuOpen(false);
    setSyncError(null);

    try {
      const res = await fetch('/api/sync/readwise/trigger', { method: 'POST' });
      const data: SyncTriggerResponse | SyncErrorResponse = await res.json();

      if (!res.ok) {
        const errorData = data as SyncErrorResponse;
        setSyncError(errorData.error || 'Failed to start sync');
        return;
      }

      setIsSyncing(true);
    } catch (err) {
      setSyncError('Network error');
      console.error('Sync trigger error:', err);
    }
  }, []);

  // Poll sync status while syncing
  useEffect(() => {
    if (!isSyncing) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch('/api/sync/readwise/status');
        const data: SyncStatus = await res.json();

        if (!cancelled) {
          if (!data.inProgress) {
            setIsSyncing(false);
            // Refresh articles after sync completes
            const location = subTabToLocation[activeSubTab] || 'new';
            const docs = await fetchDocuments(location);
            setArticles(docs);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Status check failed:', err);
          setSyncError('Status check failed');
          setIsSyncing(false);
        }
      }
    };

    // Poll immediately, then every 3 seconds
    poll();
    const intervalId = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isSyncing, activeSubTab, fetchDocuments]);

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
    async function loadDocuments() {
      if (!isConnected) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const location = subTabToLocation[activeSubTab] || 'new';
        const docs = await fetchDocuments(location);
        setArticles(docs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadDocuments();
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
      new: 'Inbox',
      later: 'Later',
      archive: 'Archive',
    };
    return {
      title: labels[activeSubTab] || 'Library',
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
          </div>
          <div className={styles.pageTitle}>
            <h1 className={styles.title}>Library</h1>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.connectPrompt}>
            <div className={styles.connectIcon}>📚</div>
            <h2>Connect Your Reader Account</h2>
            <p>Connect your Readwise Reader account to start speed reading your saved articles.</p>
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
          </div>
          <div className={styles.pageTitle}>
            <h1 className={styles.title}>Library</h1>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your articles...</p>
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
          </div>
          <div className={styles.pageTitle}>
            <h1 className={styles.title}>Library</h1>
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
            <button className={styles.iconButton} type="button" aria-label="Add article">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
            <div style={{ position: 'relative' }}>
              <button
                ref={menuButtonRef}
                className={styles.iconButton}
                type="button"
                aria-label="More options"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
              </button>
              <DropdownMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                triggerRef={menuButtonRef}
              >
                <button onClick={handleSyncTrigger} disabled={isSyncing}>
                  {isSyncing ? 'Syncing...' : 'Sync Readwise'}
                </button>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className={styles.pageTitle}>
          <h1 className={styles.title}>{tabInfo.title}</h1>
          <span className={styles.count}>{tabInfo.count}</span>
        </div>
      </header>

      {syncError && (
        <div className={styles.syncError}>
          <span>⚠️ {syncError}</span>
          <button onClick={() => setSyncError(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <div className={styles.subTabsContainer}>
        <SubTabs tabs={librarySubTabs} activeTab={activeSubTab} onTabChange={setActiveSubTab} />
      </div>

      <main className={styles.main}>
        {articles.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              className={styles.emptyIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <p className={styles.emptyTitle}>No articles here</p>
            <p className={styles.emptyDescription}>
              {activeSubTab === 'new'
                ? 'Save articles to your Readwise Reader inbox to see them here.'
                : activeSubTab === 'later'
                  ? 'Articles you mark as "Later" will appear here.'
                  : 'Archived articles will appear here.'}
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
