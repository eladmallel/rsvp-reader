import styles from './TagFilter.module.css';

export interface TagFilterProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

export function TagFilter({ tags, selectedTag, onTagSelect }: TagFilterProps) {
  return (
    <div className={styles.container} role="group" aria-label="Filter by tag">
      <div className={styles.scrollContainer}>
        <button
          className={`${styles.tag} ${selectedTag === null ? styles.active : ''}`}
          onClick={() => onTagSelect(null)}
          aria-pressed={selectedTag === null}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            className={`${styles.tag} ${selectedTag === tag ? styles.active : ''}`}
            onClick={() => onTagSelect(tag)}
            aria-pressed={selectedTag === tag}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
