import { type VariantProps, cva } from 'class-variance-authority';
import { CheckCircle, Clock, HelpCircle, XCircle } from 'lucide-react';

import * as React from 'react';

import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border',
  {
    variants: {
      variant: {
        present:
          'bg-[var(--color-success-100)] text-[var(--color-success-700)] border-[var(--color-success-200)]',
        absent:
          'bg-[var(--color-error-100)] text-[var(--color-error-700)] border-[var(--color-error-200)]',
        late: 'bg-[var(--color-warning-100)] text-[var(--color-warning-700)] border-[var(--color-warning-200)]',
        pending:
          'bg-[var(--color-background-tertiary)] text-[var(--color-text-tertiary)] border-[var(--color-border-default)]',
      },
    },
    defaultVariants: {
      variant: 'pending',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {
  showIcon?: boolean;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant, showIcon = true, children, ...props }, ref) => {
    const Icon = {
      present: CheckCircle,
      absent: XCircle,
      late: Clock,
      pending: HelpCircle,
    }[variant || 'pending'];

    return (
      <span ref={ref} className={cn(statusBadgeVariants({ variant }), className)} {...props}>
        {showIcon && <Icon className="h-3 w-3" />}
        {children}
      </span>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

export { StatusBadge, statusBadgeVariants };
