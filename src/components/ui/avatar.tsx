import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
      },
      variant: {
        default: 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]',
        accent: 'bg-[var(--color-accent-100)] text-[var(--color-accent-600)]',
        success: 'bg-[var(--color-success-100)] text-[var(--color-success-600)]',
        warning: 'bg-[var(--color-warning-100)] text-[var(--color-warning-600)]',
        error: 'bg-[var(--color-error-100)] text-[var(--color-error-600)]',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  name: string;
  src?: string;
  alt?: string;
}

/**
 * Avatar 컴포넌트
 * 이미지 또는 이니셜을 표시하는 아바타
 */
const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, variant, name, src, alt, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    // 이름에서 이니셜 추출 (첫 글자만)
    const getInitial = (name: string) => {
      return name.charAt(0).toUpperCase();
    };

    const showInitial = !src || imageError;

    return (
      <div ref={ref} className={cn(avatarVariants({ size, variant }), className)} {...props}>
        {showInitial ? (
          <span aria-label={name}>{getInitial(name)}</span>
        ) : (
          <img
            src={src}
            alt={alt || name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };
