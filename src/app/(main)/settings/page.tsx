'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

// Dynamically import modals - only loaded when opened
const WpmSettingModal = dynamic(
  () =>
    import('@/components/settings/WpmSettingModal').then((mod) => ({
      default: mod.WpmSettingModal,
    })),
  { ssr: false }
);

const SkipAmountModal = dynamic(
  () =>
    import('@/components/settings/SkipAmountModal').then((mod) => ({
      default: mod.SkipAmountModal,
    })),
  { ssr: false }
);

const FontSelectorModal = dynamic(
  () =>
    import('@/components/settings/FontSelectorModal').then((mod) => ({
      default: mod.FontSelectorModal,
    })),
  { ssr: false }
);

interface UserProfile {
  id: string;
  email: string;
  name: string;
  initials: string;
  isPro: boolean;
  readerConnected: boolean;
}

interface UserPreferences {
  defaultWpm: number;
  skipAmount: number;
  rsvpFont: string;
  theme: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Modal state
  const [isWpmModalOpen, setIsWpmModalOpen] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);

  const useSystemTheme = theme === 'system';

  // Fetch profile and preferences
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, prefsRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/user/preferences'),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        }

        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          setPreferences(prefsData);
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDarkModeToggle = useCallback(
    (checked: boolean) => {
      setTheme(checked ? 'dark' : 'light');
    },
    [setTheme]
  );

  const handleSystemThemeToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        setTheme('system');
      } else {
        // When turning off system theme, keep the current resolved theme
        setTheme(resolvedTheme);
      }
    },
    [setTheme, resolvedTheme]
  );

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
    }
  }, [router]);

  const handleDisconnectReader = useCallback(async () => {
    if (!confirm('Are you sure you want to disconnect Readwise Reader?')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/connect-reader', {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfile((prev) => (prev ? { ...prev, readerConnected: false } : null));
      }
    } catch (error) {
      console.error('Error disconnecting Reader:', error);
    }
  }, []);

  const handleSaveWpm = useCallback(async (wpm: number) => {
    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultWpm: wpm }),
    });

    if (response.ok) {
      const updated = await response.json();
      setPreferences((prev) => (prev ? { ...prev, defaultWpm: updated.defaultWpm } : null));
    } else {
      throw new Error('Failed to save WPM');
    }
  }, []);

  const handleSaveSkipAmount = useCallback(async (amount: number) => {
    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipAmount: amount }),
    });

    if (response.ok) {
      const updated = await response.json();
      setPreferences((prev) => (prev ? { ...prev, skipAmount: updated.skipAmount } : null));
    } else {
      throw new Error('Failed to save skip amount');
    }
  }, []);

  const handleSaveFont = useCallback(async (font: string) => {
    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rsvpFont: font }),
    });

    if (response.ok) {
      const updated = await response.json();
      setPreferences((prev) => (prev ? { ...prev, rsvpFont: updated.rsvpFont } : null));
    } else {
      throw new Error('Failed to save font');
    }
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <main className={styles.main}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          <div className={styles.profileAvatar}>{isLoading ? '...' : profile?.initials || '?'}</div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>
              {isLoading ? 'Loading...' : profile?.name || 'User'}
            </div>
            <div className={styles.profileEmail}>
              {isLoading ? '' : profile?.email || 'Not logged in'}
            </div>
            {profile?.isPro && <span className={styles.profileBadge}>Pro</span>}
          </div>
        </div>

        {/* Integrations */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Integrations</h2>
          <div className={styles.settingsCard}>
            <div
              className={styles.settingsItem}
              onClick={() =>
                profile?.readerConnected
                  ? handleDisconnectReader()
                  : router.push('/auth/connect-reader')
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (profile?.readerConnected) {
                    handleDisconnectReader();
                  } else {
                    router.push('/auth/connect-reader');
                  }
                }
              }}
            >
              <div className={styles.settingsItemLeft}>
                <div
                  className={`${styles.settingsIcon} ${profile?.readerConnected ? styles.success : ''}`}
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
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>Readwise Reader</div>
                  <div className={styles.settingsItemSublabel}>Sync your reading list</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <div className={styles.connectionStatus}>
                  <span
                    className={`${styles.statusDot} ${profile?.readerConnected ? '' : styles.disconnected}`}
                  />
                  <span
                    className={`${styles.statusText} ${profile?.readerConnected ? '' : styles.disconnected}`}
                  >
                    {profile?.readerConnected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <span className={styles.chevron}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Reading Preferences */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reading Preferences</h2>
          <div className={styles.settingsCard}>
            <div
              className={styles.settingsItem}
              onClick={() => setIsWpmModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsWpmModalOpen(true);
                }
              }}
            >
              <div className={styles.settingsItemLeft}>
                <div className={styles.settingsIcon}>
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
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>Default Speed</div>
                  <div className={styles.settingsItemSublabel}>Words per minute</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <span className={styles.settingsValue}>{preferences?.defaultWpm || 300} WPM</span>
                <span className={styles.chevron}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </div>

            <div
              className={styles.settingsItem}
              onClick={() => setIsSkipModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsSkipModalOpen(true);
                }
              }}
            >
              <div className={styles.settingsItemLeft}>
                <div className={styles.settingsIcon}>
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
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>Skip Amount</div>
                  <div className={styles.settingsItemSublabel}>Words to skip per tap</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <span className={styles.settingsValue}>{preferences?.skipAmount || 3} words</span>
                <span className={styles.chevron}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </div>

            <div
              className={styles.settingsItem}
              onClick={() => setIsFontModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsFontModalOpen(true);
                }
              }}
            >
              <div className={styles.settingsItemLeft}>
                <div className={styles.settingsIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="4 7 4 4 20 4 20 7" />
                    <line x1="9" y1="20" x2="15" y2="20" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                  </svg>
                </div>
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>RSVP Font</div>
                  <div className={styles.settingsItemSublabel}>Display font for reading</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <span className={styles.settingsValue}>
                  {preferences?.rsvpFont === 'monospace'
                    ? 'System Mono'
                    : preferences?.rsvpFont === 'ibm-plex-mono'
                      ? 'IBM Plex Mono'
                      : preferences?.rsvpFont === 'sans-serif'
                        ? 'Sans Serif'
                        : preferences?.rsvpFont === 'serif'
                          ? 'Serif'
                          : 'System Mono'}
                </span>
                <span className={styles.chevron}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <div className={styles.settingsCard}>
            <div className={styles.settingsItem}>
              <div className={styles.settingsItemLeft}>
                <div className={styles.settingsIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                </div>
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>Dark Mode</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <ToggleSwitch
                  checked={resolvedTheme === 'dark'}
                  onChange={handleDarkModeToggle}
                  label="Dark mode"
                  disabled={useSystemTheme}
                />
              </div>
            </div>

            <div className={styles.settingsItem}>
              <div className={styles.settingsItemLeft}>
                <div className={styles.settingsIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                </div>
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>System Theme</div>
                  <div className={styles.settingsItemSublabel}>Match device appearance</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <ToggleSwitch
                  checked={useSystemTheme}
                  onChange={handleSystemThemeToggle}
                  label="System theme"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Support</h2>
          <div className={styles.settingsCard}>
            <Link href="/help" className={styles.settingsItem}>
              <div className={styles.settingsItemLeft}>
                <div className={styles.settingsIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>Help & FAQ</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <span className={styles.chevron}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </Link>

            <a href="mailto:support@rsvpreader.com" className={styles.settingsItem}>
              <div className={styles.settingsItemLeft}>
                <div className={styles.settingsIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>Contact Support</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <span className={styles.chevron}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </a>

            <Link href="/privacy" className={styles.settingsItem}>
              <div className={styles.settingsItemLeft}>
                <div className={styles.settingsIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className={styles.settingsItemContent}>
                  <div className={styles.settingsItemLabel}>Privacy Policy</div>
                </div>
              </div>
              <div className={styles.settingsItemRight}>
                <span className={styles.chevron}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* Account */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.settingsCard}>
            <button
              className={styles.settingsItem}
              onClick={handleLogout}
              disabled={isLoggingOut}
              type="button"
            >
              <div className={styles.settingsItemLeft}>
                <div className={`${styles.settingsIcon} ${styles.danger}`}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                <div className={styles.settingsItemContent}>
                  <div className={`${styles.settingsItemLabel} ${styles.dangerText}`}>
                    {isLoggingOut ? 'Logging out...' : 'Log Out'}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Version */}
        <footer className={styles.footer}>
          <span className={styles.version}>RSVP Reader v1.0.0</span>
        </footer>
      </main>

      {/* Setting Modals */}
      {preferences && (
        <>
          <WpmSettingModal
            isOpen={isWpmModalOpen}
            onClose={() => setIsWpmModalOpen(false)}
            currentValue={preferences.defaultWpm}
            onSave={handleSaveWpm}
          />
          <SkipAmountModal
            isOpen={isSkipModalOpen}
            onClose={() => setIsSkipModalOpen(false)}
            currentValue={preferences.skipAmount}
            onSave={handleSaveSkipAmount}
          />
          <FontSelectorModal
            isOpen={isFontModalOpen}
            onClose={() => setIsFontModalOpen(false)}
            currentValue={preferences.rsvpFont}
            onSave={handleSaveFont}
          />
        </>
      )}
    </div>
  );
}
