'use client';

import styles from './page.module.css';

export default function SearchPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Search</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.searchInputWrapper}>
          <input
            type="search"
            placeholder="Search articles..."
            className={styles.searchInput}
            disabled
          />
        </div>

        <div className={styles.placeholder}>
          <p>Search feature coming soon.</p>
          <p className={styles.hint}>Search across your library and highlights.</p>
        </div>
      </main>
    </div>
  );
}
