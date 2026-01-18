'use client';

import React from 'react';
import styles from './FilterChip.module.css';

interface FilterChipProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function FilterChip({
  children,
  active = false,
  onClick,
  disabled = false,
  className = '',
}: FilterChipProps) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${active ? styles.active : ''} ${disabled ? styles.disabled : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default FilterChip;
