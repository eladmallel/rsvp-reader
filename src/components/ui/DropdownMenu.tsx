'use client';

import React, { useEffect, useRef } from 'react';
import styles from './DropdownMenu.module.css';

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  triggerRef?: React.RefObject<any>;
}

export function DropdownMenu({ isOpen, onClose, children, triggerRef }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Don't close if clicking the trigger or the menu
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    // Use a timeout to avoid closing immediately after opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - transparent, just for click detection */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Menu */}
      <div ref={menuRef} className={styles.menu} role="menu">
        {children}
      </div>
    </>
  );
}

export default DropdownMenu;
