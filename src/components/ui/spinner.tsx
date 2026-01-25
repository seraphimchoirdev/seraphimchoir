import { type VariantProps, cva } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spin rounded-full border-2 border-solid', {
  variants: {
    variant: {
      default: 'border-[var(--color-primary-100)] border-t-[var(--color-primary-400)]',
      success: 'border-[var(--color-success-100)] border-t-[var(--color-success-400)]',
      warning: 'border-[var(--color-warning-100)] border-t-[var(--color-warning-400)]',
      error: 'border-[var(--color-error-100)] border-t-[var(--color-error-400)]',
      white: 'border-white/30 border-t-white',
    },
    size: {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ variant, size }), className)}
        role="status"
        aria-label="로딩 중"
        {...props}
      >
        <span className="sr-only">로딩 중...</span>
      </div>
    );
  }
);
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };
