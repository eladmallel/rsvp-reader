'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, IconName } from './Icon';
import styles from './BottomNav.module.css';

interface NavItem {
  href: string;
  icon: IconName;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/library', icon: 'library', label: 'Library' },
  { href: '/feed', icon: 'feed', label: 'Feed' },
  { href: '/search', icon: 'search', label: 'Search' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav} aria-label="Main navigation">
      <div className={styles.inner}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon name={item.icon} size={24} />
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
