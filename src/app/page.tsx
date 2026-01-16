'use client';

import { useState } from 'react';
import {
  ArticleCard,
  TabBar,
  TagFilter,
  defaultTabs,
  type Article,
  type TabId,
} from '@/components/library';
import styles from './page.module.css';

// Mock data for prototype
const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Understanding React Server Components',
    author: 'Dan Abramov',
    siteName: 'react.dev',
    readingTime: 12,
    tags: ['react', 'javascript', 'webdev'],
    imageUrl: 'https://picsum.photos/seed/1/400/200',
  },
  {
    id: '2',
    title: 'The Future of CSS: What to Expect in 2026',
    author: 'Lea Verou',
    siteName: 'css-tricks.com',
    readingTime: 8,
    tags: ['css', 'webdev'],
  },
  {
    id: '3',
    title: 'TypeScript 6.0: Breaking Changes and New Features',
    author: 'Ryan Cavanaugh',
    siteName: 'devblogs.microsoft.com',
    readingTime: 15,
    tags: ['typescript', 'javascript'],
    imageUrl: 'https://picsum.photos/seed/3/400/200',
  },
  {
    id: '4',
    title: 'Building Accessible Web Applications',
    author: 'Marcy Sutton',
    siteName: 'a11yproject.com',
    readingTime: 10,
    tags: ['accessibility', 'webdev', 'html'],
  },
  {
    id: '5',
    title: 'The Complete Guide to Speed Reading',
    author: 'Tim Ferriss',
    siteName: 'medium.com',
    readingTime: 20,
    tags: ['productivity', 'reading'],
    imageUrl: 'https://picsum.photos/seed/5/400/200',
  },
  {
    id: '6',
    title: 'Next.js 16 Deep Dive',
    author: 'Vercel Team',
    siteName: 'nextjs.org',
    readingTime: 18,
    tags: ['nextjs', 'react', 'webdev'],
  },
];

const mockFeedArticles: Article[] = [
  {
    id: '7',
    title: 'Weekly JavaScript Newsletter #423',
    author: 'JavaScript Weekly',
    siteName: 'javascriptweekly.com',
    readingTime: 5,
    tags: ['newsletter', 'javascript'],
  },
  {
    id: '8',
    title: 'Morning Brew: Tech Edition',
    author: 'Morning Brew',
    siteName: 'morningbrew.com',
    readingTime: 3,
    tags: ['newsletter', 'tech'],
  },
];

const mockHistoryArticles: Article[] = [
  {
    id: '9',
    title: 'How to Write Clean Code',
    author: 'Robert C. Martin',
    siteName: 'cleancoders.com',
    readingTime: 25,
    tags: ['programming', 'best-practices'],
  },
];

// Extract unique tags from all articles
const allTags = Array.from(new Set(mockArticles.flatMap((article) => article.tags))).sort();

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<TabId>('library');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get articles based on active tab
  const getArticles = (): Article[] => {
    switch (activeTab) {
      case 'library':
        return mockArticles;
      case 'feed':
        return mockFeedArticles;
      case 'history':
        return mockHistoryArticles;
      default:
        return mockArticles;
    }
  };

  // Filter articles by selected tag
  const articles = getArticles().filter(
    (article) => selectedTag === null || article.tags.includes(selectedTag)
  );

  const handleArticleClick = (article: Article) => {
    // In a real app, this would navigate to the RSVP reader
    console.log('Opening article:', article.title);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>RSVP Reader</h1>
      </header>

      <nav className={styles.tabBarContainer}>
        <TabBar tabs={defaultTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </nav>

      <div className={styles.filterContainer}>
        <TagFilter tags={allTags} selectedTag={selectedTag} onTagSelect={setSelectedTag} />
      </div>

      <main
        className={styles.main}
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {articles.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No articles found{selectedTag ? ` with tag "${selectedTag}"` : ''}.</p>
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
