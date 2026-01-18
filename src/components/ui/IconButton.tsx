'use client';

import React from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${styles[variant]} ${styles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default IconButton;
