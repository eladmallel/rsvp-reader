'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface ConnectionResponse {
  connected: boolean;
  error?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const authenticated = !!user;
    setIsAuthenticated(authenticated);
    return authenticated;
  }, []);

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

  useEffect(() => {
    async function loadAuthAndConnection() {
      const authenticated = await checkAuth();
      if (!authenticated) {
        router.push('/auth/login');
        return;
      }
      await checkConnection();
    }

    loadAuthAndConnection();
  }, [checkAuth, checkConnection, router]);

  // Redirect to connect if authenticated but not connected
  useEffect(() => {
    if (isAuthenticated === true && isConnected === false) {
      router.push('/auth/connect-reader');
    }
  }, [isAuthenticated, isConnected, router]);

  if (isAuthenticated === null || isConnected === null) {
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
