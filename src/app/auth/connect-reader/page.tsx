'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui';
import styles from '../auth.module.css';
import connectStyles from './connect-reader.module.css';

export default function ConnectReaderPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

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

    // Simulate API validation for prototype
    setTimeout(() => {
      setIsLoading(false);
      // Simulate error for demo purposes
      if (token.includes('invalid')) {
        setError('Invalid token. Please check your access token and try again.');
        return;
      }
      console.log('Token validated:', { tokenLength: token.length });
      // In real app, would store token and redirect to library
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <ThemeToggle className={styles.themeToggle} />
      <div className={styles.content}>
        {/* Logo/Brand */}
        <header className={styles.header}>
          <div className={styles.logoMark}>
            <span className={styles.logoLetter}>R</span>
          </div>
          <h1 className={styles.title}>Connect Readwise Reader</h1>
          <p className={styles.subtitle}>
            Link your Readwise Reader account to start speed reading your saved articles
          </p>
        </header>

        {/* Info box */}
        <div className={connectStyles.infoBox}>
          <svg
            className={connectStyles.infoIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <p className={connectStyles.infoTitle}>What is this?</p>
            <p className={connectStyles.infoText}>
              RSVP Reader uses your Readwise Reader access token to securely fetch your saved
              articles. Your token is stored encrypted and never shared.
            </p>
          </div>
        </div>

        {/* Connect Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
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

          <div className={styles.inputGroup}>
            <label htmlFor="token" className={styles.label}>
              Access Token
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={styles.input}
                placeholder="Enter your Readwise access token"
                autoComplete="off"
                spellCheck="false"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowToken(!showToken)}
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <a
            href="https://readwise.io/access_token"
            target="_blank"
            rel="noopener noreferrer"
            className={connectStyles.tokenLink}
          >
            <svg
              className={connectStyles.externalIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            Get your access token from Readwise
          </a>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {isLoading ? 'Connecting...' : 'Connect Reader'}
          </button>
        </form>

        {/* Skip option */}
        <div className={connectStyles.skipSection}>
          <p className={styles.switchAuth}>
            Want to explore first?{' '}
            <Link href="/" className={styles.link}>
              Skip for now
            </Link>
          </p>
          <p className={connectStyles.skipNote}>
            You can connect your Reader account later in Settings.
          </p>
        </div>

        {/* Back to login */}
        <p className={styles.switchAuth}>
          <Link href="/auth/login" className={styles.link}>
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
