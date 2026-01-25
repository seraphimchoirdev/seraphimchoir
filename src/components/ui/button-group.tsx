'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ButtonGroupItem {
  label: string;
  value: string;
  disabled?: boolean;
}

interface ButtonGroupProps {
  items: ButtonGroupItem[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  disabled?: boolean;
}

const sizeStyles = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-base',
};

export function ButtonGroup({
  items,
  value,
  onChange,
  size = 'default',
  className,
  disabled = false,
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex gap-1 rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-1',
        className
      )}
      role="group"
    >
      {items.map((item) => {
        const isSelected = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            disabled={disabled || item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium whitespace-nowrap transition-all',
              'focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-1 focus-visible:outline-none',
              'disabled:pointer-events-none disabled:opacity-50',
              sizeStyles[size],
              isSelected
                ? 'bg-[var(--color-primary-600)] text-white shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
