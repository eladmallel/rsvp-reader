'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArticleCard,
  TabBar,
  TagFilter,
  defaultTabs,
  type Article,
  type TabId,
} from '@/components/library';
import { ThemeToggle } from '@/components/ui';
import styles from './page.module.css';

interface DocumentFromApi {
  id: string;
  title: string;
  author: string | null;
  source: string | null;
  siteName: string | null;
  url: string;
  sourceUrl: string;
  category: string;
  location: string;
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

interface TagsResponse {
  tags?: Array<{ name: string; count: number }>;
  error?: string;
}

interface ConnectionResponse {
  connected: boolean;
  error?: string;
}

// Convert API document to Article format for our components
function documentToArticle(doc: DocumentFromApi): Article {
  const readingTime = doc.wordCount ? Math.ceil(doc.wordCount / 200) : 5; // Assume 200 WPM average
  return {
    id: doc.id,
    title: doc.title,
    author: doc.author || 'Unknown',
    siteName: doc.siteName || doc.source || 'Unknown',
    readingTime,
    tags: doc.tags,
    imageUrl: doc.imageUrl || undefined,
  };
}

export default function LibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('library');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // API state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Data from API
  const [libraryArticles, setLibraryArticles] = useState<Article[]>([]);
  const [feedArticles, setFeedArticles] = useState<Article[]>([]);
  const [historyArticles] = useState<Article[]>([]); // Will be implemented in Phase 4
  const [availableTags, setAvailableTags] = useState<string[]>([]);

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

      return (data.documents || []).map(documentToArticle);
    } catch (err) {
      console.error(`Error fetching ${location} documents:`, err);
      return [];
    }
  }, []);

  // Fetch tags from API
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/reader/tags');
      const data: TagsResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch tags');
      }

      return (data.tags || []).map((t) => t.name);
    } catch (err) {
      console.error('Error fetching tags:', err);
      return [];
    }
  }, []);

  // Initial data load
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const connected = await checkConnection();

        if (!connected) {
          setIsLoading(false);
          return;
        }

        // Fetch all data in parallel
        const [library, feed, tags] = await Promise.all([
          fetchDocuments('later'),
          fetchDocuments('feed'),
          fetchTags(),
        ]);

        setLibraryArticles(library);
        setFeedArticles(feed);
        setAvailableTags(tags);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [checkConnection, fetchDocuments, fetchTags]);

  // Get articles based on active tab
  const getArticles = (): Article[] => {
    switch (activeTab) {
      case 'library':
        return libraryArticles;
      case 'feed':
        return feedArticles;
      case 'history':
        return historyArticles;
      default:
        return libraryArticles;
    }
  };

  // Filter articles by selected tag
  const articles = getArticles().filter(
    (article) => selectedTag === null || article.tags.includes(selectedTag)
  );

  const handleArticleClick = (article: Article) => {
    // Navigate to the RSVP reader with the article
    router.push(`/rsvp?id=${article.id}`);
  };

  // Not connected state
  if (isConnected === false) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>RSVP Reader</h1>
          <ThemeToggle />
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
  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>RSVP Reader</h1>
          <ThemeToggle />
        </header>

        <main className={styles.main}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
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
          <h1 className={styles.title}>RSVP Reader</h1>
          <ThemeToggle />
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
        <h1 className={styles.title}>RSVP Reader</h1>
        <ThemeToggle />
      </header>

      <nav className={styles.tabBarContainer}>
        <TabBar tabs={defaultTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </nav>

      <div className={styles.filterContainer}>
        <TagFilter tags={availableTags} selectedTag={selectedTag} onTagSelect={setSelectedTag} />
      </div>

      <main
        className={styles.main}
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {articles.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {selectedTag
                ? `No articles found with tag "${selectedTag}".`
                : activeTab === 'history'
                  ? 'No reading history yet. Start reading!'
                  : 'No articles found. Save some articles in Readwise Reader!'}
            </p>
          </div>
        ) : (
          <div className={styles.articleGrid}>
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} onClick={handleArticleClick} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
