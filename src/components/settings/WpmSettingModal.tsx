'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Stepper } from '@/components/ui/Stepper';
import styles from './SettingModal.module.css';

interface WpmSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: number;
  onSave: (value: number) => Promise<void>;
}

export function WpmSettingModal({ isOpen, onClose, currentValue, onSave }: WpmSettingModalProps) {
  const [value, setValue] = useState(currentValue);
  const [isSaving, setIsSaving] = useState(false);

  // Reset value when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setValue(currentValue);
    }
  }, [isOpen, currentValue]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(value);
      onClose();
    } catch (error) {
      console.error('Error saving WPM:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Default Speed">
      <div className={styles.description}>
        Set your preferred reading speed. This will be used as the default speed when starting a new
        article.
      </div>

      <div className={styles.stepperContainer}>
        <Stepper
          value={value}
          onChange={setValue}
          min={120}
          max={900}
          step={10}
          unit="WPM"
          label=""
          className={styles.largeStepper}
        />
      </div>

      <div className={styles.helpText}>
        <div className={styles.helpRow}>
          <span>Beginner:</span>
          <span>200-300 WPM</span>
        </div>
        <div className={styles.helpRow}>
          <span>Intermediate:</span>
          <span>300-450 WPM</span>
        </div>
        <div className={styles.helpRow}>
          <span>Advanced:</span>
          <span>450-700 WPM</span>
        </div>
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

export default WpmSettingModal;
