'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import styles from './SettingModal.module.css';

interface FontOption {
  value: string;
  label: string;
  fontFamily: string;
}

const FONT_OPTIONS: FontOption[] = [
  { value: 'monospace', label: 'System Mono', fontFamily: 'monospace' },
  { value: 'ibm-plex-mono', label: 'IBM Plex Mono', fontFamily: '"IBM Plex Mono", monospace' },
  { value: 'sans-serif', label: 'Sans Serif', fontFamily: 'sans-serif' },
  { value: 'serif', label: 'Serif', fontFamily: 'serif' },
];

interface FontSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onSave: (value: string) => Promise<void>;
}

export function FontSelectorModal({
  isOpen,
  onClose,
  currentValue,
  onSave,
}: FontSelectorModalProps) {
  const [selectedFont, setSelectedFont] = useState(currentValue);
  const [isSaving, setIsSaving] = useState(false);

  // Reset value when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFont(currentValue);
    }
  }, [isOpen, currentValue]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedFont);
      onClose();
    } catch (error) {
      console.error('Error saving font:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="RSVP Font">
      <div className={styles.description}>
        Choose the font used to display words during RSVP reading. Monospaced fonts help maintain
        consistent word positioning.
      </div>

      <div className={styles.fontList}>
        {FONT_OPTIONS.map((font) => (
          <button
            key={font.value}
            className={`${styles.fontOption} ${selectedFont === font.value ? styles.selected : ''}`}
            type="button"
            onClick={() => setSelectedFont(font.value)}
          >
            <div className={styles.fontOptionLeft}>
              <div className={styles.radioOuter}>
                {selectedFont === font.value && <div className={styles.radioInner} />}
              </div>
              <span className={styles.fontLabel}>{font.label}</span>
            </div>
            <div className={styles.fontPreview} style={{ fontFamily: font.fontFamily }}>
              Reading
            </div>
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          type="button"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </BottomSheet>
  );
}

export default FontSelectorModal;
