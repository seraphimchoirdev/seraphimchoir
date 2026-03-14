'use client';

import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type ColorScheme = 'green' | 'red' | 'amber' | 'blue';

interface VoteButtonProps {
  selected: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  colorScheme: ColorScheme;
}

const COLOR_MAP: Record<
  ColorScheme,
  { selected: string; unselected: string; glow: string }
> = {
  green: {
    selected: 'bg-green-600 text-white border-green-600',
    unselected:
      'border-[var(--color-border-default)] text-[var(--color-text-primary)] bg-[var(--color-background-primary)] hover:bg-green-50',
    glow: 'shadow-[0_0_0_3px_rgba(22,163,74,0.25)]',
  },
  red: {
    selected: 'bg-red-600 text-white border-red-600',
    unselected:
      'border-[var(--color-border-default)] text-[var(--color-text-primary)] bg-[var(--color-background-primary)] hover:bg-red-50',
    glow: 'shadow-[0_0_0_3px_rgba(220,38,38,0.25)]',
  },
  amber: {
    selected: 'bg-amber-500 text-white border-amber-500',
    unselected:
      'border-[var(--color-border-default)] text-[var(--color-text-primary)] bg-[var(--color-background-primary)] hover:bg-amber-50',
    glow: 'shadow-[0_0_0_3px_rgba(245,158,11,0.25)]',
  },
  blue: {
    selected: 'bg-blue-600 text-white border-blue-600',
    unselected:
      'border-[var(--color-border-default)] text-[var(--color-text-primary)] bg-[var(--color-background-primary)] hover:bg-blue-50',
    glow: 'shadow-[0_0_0_3px_rgba(37,99,235,0.25)]',
  },
};

export function VoteButton({
  selected,
  icon,
  label,
  onClick,
  disabled = false,
  colorScheme,
}: VoteButtonProps) {
  const colors = COLOR_MAP[colorScheme];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 text-base font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
        selected
          ? cn(colors.selected, colors.glow, 'font-semibold')
          : colors.unselected
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {selected ? <Check className="h-5 w-5" /> : icon}
      </span>
      {label}
    </button>
  );
}
