import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-primary-200)] bg-[var(--color-primary-100)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-200)]",
        secondary:
          "border-transparent bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)]",
        destructive:
          "border-[var(--color-error-200)] bg-[var(--color-error-100)] text-[var(--color-error-700)] hover:bg-[var(--color-error-200)]",
        outline: "text-[var(--color-text-primary)] border-[var(--color-border-default)]",
        success:
          "border-[var(--color-success-200)] bg-[var(--color-success-100)] text-[var(--color-success-700)] hover:bg-[var(--color-success-200)]",
        warning:
          "border-[var(--color-warning-200)] bg-[var(--color-warning-100)] text-[var(--color-warning-700)] hover:bg-[var(--color-warning-200)]",
        accent:
          "border-[var(--color-accent-200)] bg-[var(--color-accent-100)] text-[var(--color-accent-700)] hover:bg-[var(--color-accent-200)]",
        error:
          "border-[var(--color-error-200)] bg-[var(--color-error-100)] text-[var(--color-error-700)] hover:bg-[var(--color-error-200)]",
        info:
          "border-[var(--color-primary-200)] bg-[var(--color-primary-100)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-200)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
