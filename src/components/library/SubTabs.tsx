'use client';

import styles from './SubTabs.module.css';

export interface SubTab {
  id: string;
  label: string;
}

export interface SubTabsProps {
  tabs: SubTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function SubTabs({ tabs, activeTab, onTabChange }: SubTabsProps) {
  return (
    <nav className={styles.subTabs} role="tablist" aria-label="Filter tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`${styles.subTab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

// Pre-defined tab configurations
export const librarySubTabs: SubTab[] = [
  { id: 'new', label: 'Inbox' },
  { id: 'later', label: 'Later' },
  { id: 'archive', label: 'Archive' },
];

export const feedSubTabs: SubTab[] = [
  { id: 'unseen', label: 'Unseen' },
  { id: 'seen', label: 'Seen' },
];
