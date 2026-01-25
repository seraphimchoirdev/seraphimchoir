'use client';

import * as React from 'react';

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
}

export function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  className = '',
  variant = 'default',
}: SwitchProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-[var(--color-text-secondary)] focus:ring-[var(--color-text-secondary)]';
      case 'accent':
        return 'bg-[var(--color-accent-400)] focus:ring-[var(--color-accent-400)]';
      case 'success':
        return 'bg-[var(--color-success-400)] focus:ring-[var(--color-success-400)]';
      case 'warning':
        return 'bg-[var(--color-warning-400)] focus:ring-[var(--color-warning-400)]';
      case 'error':
        return 'bg-[var(--color-error-400)] focus:ring-[var(--color-error-400)]';
      default:
        return 'bg-[var(--color-primary-400)] focus:ring-[var(--color-primary-400)]';
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none ${checked ? getVariantColor() : 'bg-[var(--color-border-strong)]'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className} `}
      style={{
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'} `}
        style={{
          boxShadow: 'var(--shadow-sm)',
        }}
      />
    </button>
  );
}
