'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface ConnectionResponse {
  connected: boolean;
  error?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        const response = await fetch('/api/auth/connect-reader');
        const data: ConnectionResponse = await response.json();
        setIsConnected(data.connected);
      } catch {
        setIsConnected(false);
      }
    }

    checkConnection();
  }, []);

  // Redirect to connect if not connected
  useEffect(() => {
    if (isConnected === false) {
      router.push('/auth/connect-reader');
    }
  }, [isConnected, router]);

  if (isConnected === null) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>{greeting}</h1>
        <p className={styles.subtitle}>Ready to speed read?</p>
      </header>

      <main className={styles.main}>
        {/* Stats section - placeholder */}
        <section className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Articles this week</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>0m</div>
            <div className={styles.statLabel}>Time saved</div>
          </div>
        </section>

        {/* Quick actions */}
        <section className={styles.quickActions}>
          <button className={styles.actionButton} onClick={() => router.push('/library')}>
            Go to Library
          </button>
          <button
            className={`${styles.actionButton} ${styles.secondary}`}
            onClick={() => router.push('/feed')}
          >
            View Feed
          </button>
        </section>
      </main>
    </div>
  );
}
