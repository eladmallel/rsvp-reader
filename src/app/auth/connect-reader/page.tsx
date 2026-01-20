'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ui';
import styles from './connect-reader.module.css';

interface ConnectResponse {
  success: boolean;
  error?: string;
}

export default function ConnectReaderPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToken(text);
    } catch {
      // Clipboard API not available or permission denied
      console.log('Could not read clipboard');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!token.trim()) {
      setError('Please enter your Readwise Reader access token');
      return;
    }

    // Token format validation (basic check)
    if (token.trim().length < 20) {
      setError("This doesn't look like a valid access token. Please check and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/connect-reader', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data: ConnectResponse = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to connect. Please try again.');
        return;
      }

      // Success - show success state
      setIsConnected(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/');
  };

  const handleSkip = () => {
    router.push('/');
  };

  return (
    <div className={styles.container}>
      <ThemeToggle className={styles.themeToggle} />

      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
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
              <line x1="16" y1="8" x2="16" y2="16" />
              <line x1="20" y1="10" x2="20" y2="14" />
            </svg>
          </div>
          <span className={styles.logoText}>RSVP Reader</span>
        </div>

        {!isConnected ? (
          /* Form State */
          <div className={styles.formState}>
            {/* Integration Card */}
            <div className={styles.integrationCard}>
              <div className={styles.integrationLogos}>
                <div className={`${styles.integrationLogo} ${styles.rsvp}`}>
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
                    <line x1="16" y1="8" x2="16" y2="16" />
                    <line x1="20" y1="10" x2="20" y2="14" />
                  </svg>
                </div>
                <div className={styles.integrationConnector}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </div>
                <div className={`${styles.integrationLogo} ${styles.readwise}`}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
              <h1 className={styles.integrationTitle}>Connect Readwise Reader</h1>
              <p className={styles.integrationDescription}>
                Sync your reading list and read articles at lightning speed with RSVP
              </p>
            </div>

            {/* Features List */}
            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <svg
                  className={styles.featureIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className={styles.featureText}>
                  Access your entire Readwise library instantly
                </span>
              </div>
              <div className={styles.featureItem}>
                <svg
                  className={styles.featureIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className={styles.featureText}>
                  Automatically sync read status and progress
                </span>
              </div>
              <div className={styles.featureItem}>
                <svg
                  className={styles.featureIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className={styles.featureText}>
                  Save highlights back to your Readwise account
                </span>
              </div>
            </div>

            {/* Token Form */}
            <form className={styles.tokenSection} onSubmit={handleSubmit}>
              {error && (
                <div className={styles.error} role="alert">
                  <svg
                    className={styles.errorIcon}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className={styles.tokenHeader}>
                <label htmlFor="token" className={styles.tokenLabel}>
                  Access Token
                </label>
                <a
                  href="https://readwise.io/access_token"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.tokenHelp}
                >
                  Get your token
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>

              <div className={styles.tokenInputWrapper}>
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={styles.tokenInput}
                  placeholder="Paste your Readwise access token"
                  autoComplete="off"
                  spellCheck="false"
                  required
                />
                <button
                  type="button"
                  className={styles.tokenPaste}
                  onClick={handlePaste}
                  aria-label="Paste from clipboard"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Paste
                </button>
              </div>

              <p className={styles.tokenHint}>
                Your token is stored securely and only used to sync with Readwise.{' '}
                <a
                  href="https://readwise.io/access_token"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get your token here
                </a>
                .
              </p>

              <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
                {isLoading ? (
                  <span className={styles.spinner} aria-hidden="true" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                )}
                {isLoading ? 'Connecting...' : 'Connect Readwise'}
              </button>

              <button type="button" className={styles.btnSecondary} onClick={handleSkip}>
                Skip for now
              </button>
            </form>

            {/* Back to login */}
            <p className={styles.switchAuth}>
              <Link href="/auth/login" className={styles.link}>
                ← Back to login
              </Link>
            </p>
          </div>
        ) : (
          /* Success State */
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className={styles.successTitle}>Connected!</h2>
            <p className={styles.successDescription}>
              Your Readwise account is now linked. Let&apos;s start reading.
            </p>
            <button type="button" className={styles.btnPrimary} onClick={handleContinue}>
              Go to Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
