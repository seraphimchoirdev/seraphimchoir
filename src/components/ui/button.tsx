import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // 기본 Variants - Design System Colors
        default:
          "bg-[var(--color-primary-400)] text-white hover:bg-[var(--color-primary-500)] active:bg-[var(--color-primary-600)] focus-visible:ring-[var(--color-primary-200)]",
        secondary:
          "bg-[var(--color-primary-100)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-200)] active:bg-[var(--color-primary-300)] border border-[var(--color-primary-200)] focus-visible:ring-[var(--color-primary-300)]",
        outline:
          "border border-[var(--color-border-default)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] hover:border-[var(--color-border-strong)] active:bg-[var(--color-background-secondary)] focus-visible:ring-[var(--color-primary-200)]",
        ghost:
          "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] active:bg-[var(--color-background-secondary)] focus-visible:ring-[var(--color-primary-200)]",
        destructive:
          "bg-[var(--color-error-500)] text-white hover:bg-[var(--color-error-600)] active:bg-[var(--color-error-700)] focus-visible:ring-[var(--color-error-200)]",
        link:
          "text-[var(--color-primary-600)] underline-offset-4 hover:underline hover:text-[var(--color-primary-700)] bg-transparent",

        // Design System Color Variants
        success:
          "bg-[var(--color-success-500)] text-white hover:bg-[var(--color-success-600)] active:bg-[var(--color-success-700)] focus-visible:ring-[var(--color-success-200)]",
        warning:
          "bg-[var(--color-warning-500)] text-[var(--color-warning-900)] hover:bg-[var(--color-warning-600)] active:bg-[var(--color-warning-700)] focus-visible:ring-[var(--color-warning-200)]",
        accent:
          "bg-[var(--color-accent-500)] text-white hover:bg-[var(--color-accent-600)] active:bg-[var(--color-accent-700)] focus-visible:ring-[var(--color-accent-200)]",
        primarySubtle:
          "bg-[var(--color-primary-100)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-200)] active:bg-[var(--color-primary-300)] focus-visible:ring-[var(--color-primary-300)] border border-[var(--color-primary-200)]",
        successSubtle:
          "bg-[var(--color-success-100)] text-[var(--color-success-700)] hover:bg-[var(--color-success-200)] active:bg-[var(--color-success-300)] focus-visible:ring-[var(--color-success-300)] border border-[var(--color-success-200)]",
        warningSubtle:
          "bg-[var(--color-warning-100)] text-[var(--color-warning-700)] hover:bg-[var(--color-warning-200)] active:bg-[var(--color-warning-300)] focus-visible:ring-[var(--color-warning-300)] border border-[var(--color-warning-200)]",
        errorSubtle:
          "bg-[var(--color-error-100)] text-[var(--color-error-700)] hover:bg-[var(--color-error-200)] active:bg-[var(--color-error-300)] focus-visible:ring-[var(--color-error-300)] border border-[var(--color-error-200)]",
        accentSubtle:
          "bg-[var(--color-accent-100)] text-[var(--color-accent-700)] hover:bg-[var(--color-accent-200)] active:bg-[var(--color-accent-300)] focus-visible:ring-[var(--color-accent-300)] border border-[var(--color-accent-200)]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
