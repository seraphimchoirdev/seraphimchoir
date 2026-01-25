import React from 'react';

import { cn } from '@/lib/utils';

// Assuming cn utility exists, standard in shadcn/ui projects

export type TypographyVariant =
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'body-large'
  | 'body-base'
  | 'body-small'
  | 'caption'
  | 'label';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  as?: React.ElementType;
}

const variantToTag: Record<TypographyVariant, React.ElementType> = {
  'heading-1': 'h1',
  'heading-2': 'h2',
  'heading-3': 'h3',
  'heading-4': 'h4',
  'body-large': 'p',
  'body-base': 'p',
  'body-small': 'p',
  caption: 'span',
  label: 'span',
};

export function Typography({
  variant = 'body-base',
  as,
  className,
  children,
  ...props
}: TypographyProps) {
  const Component = as || variantToTag[variant] || 'p';

  return (
    <Component className={cn(variant, className)} {...props}>
      {children}
    </Component>
  );
}

// Semantic aliases for convenience
export function Heading({
  level,
  ...props
}: { level: 1 | 2 | 3 | 4 } & Omit<TypographyProps, 'variant'>) {
  return <Typography variant={`heading-${level}` as TypographyVariant} {...props} />;
}

export function Text({ ...props }: TypographyProps) {
  return <Typography {...props} />;
}
