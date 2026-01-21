'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Stepper } from '@/components/ui/Stepper';
import styles from './SettingModal.module.css';

interface SkipAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: number;
  onSave: (value: number) => Promise<void>;
}

export function SkipAmountModal({ isOpen, onClose, currentValue, onSave }: SkipAmountModalProps) {
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
      console.error('Error saving skip amount:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Skip Amount">
      <div className={styles.description}>
        Number of words to skip forward or backward when using the skip buttons during RSVP reading.
      </div>

      <div className={styles.stepperContainer}>
        <Stepper
          value={value}
          onChange={setValue}
          min={1}
          max={20}
          step={1}
          unit={value === 1 ? 'word' : 'words'}
          label=""
          className={styles.largeStepper}
        />
      </div>

      <div className={styles.helpText}>
        <div className={styles.helpRow}>
          <span>Quick adjustments:</span>
          <span>1-3 words</span>
        </div>
        <div className={styles.helpRow}>
          <span>Fast skimming:</span>
          <span>5-10 words</span>
        </div>
        <div className={styles.helpRow}>
          <span>Rapid navigation:</span>
          <span>10+ words</span>
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

export default SkipAmountModal;
