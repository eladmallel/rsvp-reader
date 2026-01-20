'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

type FilterType = 'all' | 'library' | 'feed' | 'highlights';

interface SearchResult {
  id: string;
  title: string;
  titleHighlight: string;
  snippet: string;
  snippetHighlight: string;
  source: string;
  sourceName: string;
  author: string;
  readTime: string;
  tags: string[];
  thumbnail?: string;
  location: string;
  createdAt: string;
}

const RECENT_SEARCHES_KEY = 'rsvp-recent-searches';
const MAX_RECENT_SEARCHES = 10;

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

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== searchQuery.toLowerCase());
      const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  // Remove recent search
  const removeRecentSearch = useCallback((searchQuery: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== searchQuery);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  // Clear all recent searches
  const clearAllRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Perform search
  const performSearch = useCallback(
    async (searchQuery: string, searchFilter: FilterType) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          q: searchQuery.trim(),
          filter: searchFilter,
        });

        const response = await fetch(`/api/search?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }

        setResults(data.results || []);
        saveRecentSearch(searchQuery.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [saveRecentSearch]
  );

  // Debounced search
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!newQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        performSearch(newQuery, filter);
      }, 300);
    },
    [filter, performSearch]
  );

  // Handle filter change
  const handleFilterChange = useCallback(
    (newFilter: FilterType) => {
      setFilter(newFilter);
      if (query.trim()) {
        performSearch(query, newFilter);
      }
    },
    [query, performSearch]
  );

  // Handle recent search click
  const handleRecentClick = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      performSearch(searchQuery, filter);
      inputRef.current?.focus();
    },
    [filter, performSearch]
  );

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  }, []);

  // Navigate to article
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      router.push(`/rsvp?id=${result.id}`);
    },
    [router]
  );

  const showEmpty = !hasSearched && query.trim().length === 0;
  const showResults = hasSearched && results.length > 0;
  const showNoResults = hasSearched && results.length === 0 && !isLoading && !error;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Search</h1>

        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <svg
              className={styles.searchIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Articles, highlights, notes..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className={`${styles.searchClear} ${query.length > 0 ? styles.visible : ''}`}
              onClick={handleClear}
              aria-label="Clear search"
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

          <div className={styles.filterChips}>
            <button
              type="button"
              className={`${styles.filterChip} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter === 'library' ? styles.active : ''}`}
              onClick={() => handleFilterChange('library')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="4" y1="6" x2="4" y2="18" />
                <line x1="8" y1="6" x2="8" y2="18" />
                <line x1="12" y1="6" x2="12" y2="18" />
              </svg>
              Library
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter === 'feed' ? styles.active : ''}`}
              onClick={() => handleFilterChange('feed')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
              Feed
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter === 'highlights' ? styles.active : ''}`}
              onClick={() => handleFilterChange('highlights')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
              </svg>
              Highlights
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Loading state */}
        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Searching...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
          </div>
        )}

        {/* Empty state - Recent searches */}
        {showEmpty && !isLoading && (
          <div className={styles.searchState}>
            {recentSearches.length > 0 ? (
              <>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Recent</span>
                  <button
                    type="button"
                    className={styles.sectionAction}
                    onClick={clearAllRecentSearches}
                  >
                    Clear All
                  </button>
                </div>
                <div className={styles.recentList}>
                  {recentSearches.map((search) => (
                    <div
                      key={search}
                      className={styles.recentItem}
                      onClick={() => handleRecentClick(search)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRecentClick(search);
                        }
                      }}
                    >
                      <div className={styles.recentIcon}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <span className={styles.recentText}>{search}</span>
                      <button
                        type="button"
                        className={styles.recentRemove}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(search);
                        }}
                        aria-label={`Remove ${search} from recent searches`}
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
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <svg
                  className={styles.emptyIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <div className={styles.emptyTitle}>Search your library</div>
                <div className={styles.emptyDescription}>
                  Find articles by title, author, or content
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {showResults && !isLoading && (
          <div className={styles.searchState}>
            <div className={styles.resultsHeader}>
              <span className={styles.resultsCount}>
                <strong>
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </strong>{' '}
                for &quot;{query}&quot;
              </span>
            </div>
            <div className={styles.resultList}>
              {results.map((result) => (
                <article
                  key={result.id}
                  className={styles.resultItem}
                  onClick={() => handleResultClick(result)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleResultClick(result);
                    }
                  }}
                >
                  <div className={styles.resultMain}>
                    <div className={styles.resultSource}>
                      <div className={styles.sourceIcon}>{getSourceIcon(result.sourceName)}</div>
                      <span className={styles.sourceName}>{result.sourceName.toUpperCase()}</span>
                    </div>
                    <h2
                      className={styles.resultTitle}
                      dangerouslySetInnerHTML={{ __html: result.titleHighlight }}
                    />
                    <p
                      className={styles.resultSnippet}
                      dangerouslySetInnerHTML={{ __html: result.snippetHighlight }}
                    />
                    <div className={styles.resultMeta}>
                      <span>{result.author}</span>
                      <span>·</span>
                      <span>{result.readTime}</span>
                      {result.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className={styles.resultTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {result.thumbnail && (
                    <div className={styles.resultThumbnail}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={result.thumbnail} alt="" />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {showNoResults && (
          <div className={styles.noResults}>
            <svg
              className={styles.noResultsIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="8" x2="14" y2="14" />
              <line x1="14" y1="8" x2="8" y2="14" />
            </svg>
            <div className={styles.noResultsTitle}>No results found</div>
            <div className={styles.noResultsDescription}>
              Try different keywords or check your filters
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
