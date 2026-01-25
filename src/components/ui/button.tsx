import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-base)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary-600)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-700)]',
        destructive:
          'bg-[var(--color-error-600)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-error-700)]',
        outline:
          'border border-[var(--color-border-default)] bg-[var(--color-background-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-background-tertiary)] hover:text-[var(--color-text-primary)]',
        secondary:
          'bg-[var(--color-background-tertiary)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-border-subtle)]',
        ghost: 'hover:bg-[var(--color-background-tertiary)] hover:text-[var(--color-text-primary)]',
        link: 'text-[var(--color-primary-600)] underline-offset-4 hover:underline',
        success:
          'bg-[var(--color-success-600)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-success-700)]',
        warning:
          'bg-[var(--color-warning-500)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-warning-600)]',
        accent:
          'bg-[var(--color-primary-500)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-600)]',
        primarySubtle:
          'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-200)]',
        successSubtle:
          'bg-[var(--color-success-100)] text-[var(--color-success-700)] hover:bg-[var(--color-success-200)]',
        warningSubtle:
          'bg-[var(--color-warning-100)] text-[var(--color-warning-600)] hover:bg-[var(--color-warning-200)]',
        errorSubtle:
          'bg-[var(--color-error-100)] text-[var(--color-error-700)] hover:bg-[var(--color-error-200)]',
        accentSubtle:
          'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] hover:bg-[var(--color-primary-100)]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-[var(--radius-sm)] px-3 text-xs',
        lg: 'h-10 rounded-[var(--radius-base)] px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
