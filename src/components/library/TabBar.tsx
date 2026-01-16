import styles from './TabBar.module.css';

export type TabId = 'library' | 'feed' | 'history';

export interface Tab {
  id: TabId;
  label: string;
}

export interface TabBarProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className={styles.tabBar} role="tablist" aria-label="Content sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          id={`tab-${tab.id}`}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
      <div
        className={styles.indicator}
        style={{
          transform: `translateX(${tabs.findIndex((t) => t.id === activeTab) * 100}%)`,
          width: `${100 / tabs.length}%`,
        }}
      />
    </nav>
  );
}

// Default tabs configuration
export const defaultTabs: Tab[] = [
  { id: 'library', label: 'Library' },
  { id: 'feed', label: 'Feed' },
  { id: 'history', label: 'History' },
];
