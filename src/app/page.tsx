import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>RSVP Reader</h1>
        <p>Speed reading with Readwise Reader integration</p>
      </header>

      <main className={styles.main}>
        {/* Design tokens demonstration */}
        <section className={styles.section} aria-labelledby="colors-heading">
          <h2 id="colors-heading">Colors</h2>
          <div className={styles.colorGrid}>
            <div className={styles.colorSwatch} style={{ backgroundColor: 'var(--bg-primary)' }}>
              <span>bg-primary</span>
            </div>
            <div className={styles.colorSwatch} style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <span>bg-secondary</span>
            </div>
            <div className={styles.colorSwatch} style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <span>bg-elevated</span>
            </div>
            <div
              className={styles.colorSwatch}
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <span>accent-primary</span>
            </div>
            <div
              className={styles.colorSwatch}
              style={{ backgroundColor: 'var(--accent-secondary)' }}
            >
              <span>accent-secondary</span>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="typography-heading">
          <h2 id="typography-heading">Typography</h2>
          <div className={styles.typographyDemo}>
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
            <p>
              This is body text using the Inter font family. It demonstrates the default text
              styling with proper line height and color.
            </p>
            <p className={styles.secondaryText}>
              This is secondary text with a muted color for less important content.
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="rsvp-heading">
          <h2 id="rsvp-heading">RSVP Display Preview</h2>
          <div className={styles.rsvpDemo}>
            <div className={styles.rsvpWord}>
              <span className={styles.rsvpLeft}>Read</span>
              <span className={styles.rsvpCenter}>i</span>
              <span className={styles.rsvpRight}>ng</span>
            </div>
            <p className={styles.rsvpCaption}>
              The red letter is the Optimal Recognition Point (ORP)
            </p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="spacing-heading">
          <h2 id="spacing-heading">Spacing Scale</h2>
          <div className={styles.spacingDemo}>
            <div className={styles.spacingBox} style={{ padding: 'var(--space-xs)' }}>
              xs
            </div>
            <div className={styles.spacingBox} style={{ padding: 'var(--space-sm)' }}>
              sm
            </div>
            <div className={styles.spacingBox} style={{ padding: 'var(--space-md)' }}>
              md
            </div>
            <div className={styles.spacingBox} style={{ padding: 'var(--space-lg)' }}>
              lg
            </div>
            <div className={styles.spacingBox} style={{ padding: 'var(--space-xl)' }}>
              xl
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
