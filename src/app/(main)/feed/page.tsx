'use client';

import styles from './page.module.css';

export default function FeedPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Feed</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.placeholder}>
          <p>Feed page coming soon.</p>
          <p className={styles.hint}>Articles from your RSS feeds will appear here.</p>
        </div>
      </main>
    </div>
  );
}
