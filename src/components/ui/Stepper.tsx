'use client';

import React from 'react';
import { Icon } from './Icon';
import styles from './Stepper.module.css';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  label,
  disabled = false,
  className = '',
}: StepperProps) {
  const handleDecrement = () => {
    if (!disabled) {
      const newValue = Math.max(min, value - step);
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    if (!disabled) {
      const newValue = Math.min(max, value + step);
      onChange(newValue);
    }
  };

  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <div className={`${styles.container} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={`${styles.stepper} ${disabled ? styles.disabled : ''}`}>
        <button
          type="button"
          className={styles.button}
          onClick={handleDecrement}
          disabled={disabled || !canDecrement}
          aria-label={`Decrease ${label || 'value'}`}
        >
          <Icon name="minus" size={12} />
        </button>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
        <button
          type="button"
          className={styles.button}
          onClick={handleIncrement}
          disabled={disabled || !canIncrement}
          aria-label={`Increase ${label || 'value'}`}
        >
          <Icon name="plus" size={12} />
        </button>
      </div>
    </div>
  );
}

export default Stepper;
