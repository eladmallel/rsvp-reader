'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import styles from './page.module.css';

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();

  const handleDarkModeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <main className={styles.main}>
        {/* Profile section - placeholder */}
        <section className={styles.section}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>?</div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>User</div>
              <div className={styles.profileEmail}>Not logged in</div>
            </div>
          </div>
        </section>

        {/* Appearance section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Dark Mode</span>
            <ToggleSwitch
              checked={resolvedTheme === 'dark'}
              onChange={handleDarkModeToggle}
              label="Dark mode"
            />
          </div>
        </section>

        {/* Reading preferences - placeholder */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reading Preferences</h2>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Default WPM</span>
            <span className={styles.settingValue}>300</span>
          </div>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Skip Amount</span>
            <span className={styles.settingValue}>3 words</span>
          </div>
        </section>

        {/* Support section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Support</h2>
          <button className={styles.linkButton}>Help & FAQ</button>
          <button className={styles.linkButton}>Contact Support</button>
          <button className={styles.linkButton}>Privacy Policy</button>
        </section>

        {/* Version */}
        <footer className={styles.footer}>
          <span className={styles.version}>RSVP Reader v0.1.0</span>
        </footer>
      </main>
    </div>
  );
}
