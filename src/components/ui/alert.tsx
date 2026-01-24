import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-[var(--radius-lg)] border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11',
  {
    variants: {
      variant: {
        default: 'bg-white text-[var(--color-text-primary)] border-[var(--color-border-default)]',
        success:
          'bg-[var(--color-success-50)] text-[var(--color-success-700)] border-[var(--color-success-200)]',
        warning:
          'bg-[var(--color-warning-50)] text-[var(--color-warning-700)] border-[var(--color-warning-200)]',
        error:
          'bg-[var(--color-error-50)] text-[var(--color-error-700)] border-[var(--color-error-200)]',
        info: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & { icon?: React.ElementType }
>(({ className, variant, icon: IconComponent, children, ...props }, ref) => {
  const Icon = IconComponent || {
    default: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
    info: Info,
  }[variant || 'default'];

  return (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="h-4 w-4" />
      <div>{children}</div>
    </div>
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
