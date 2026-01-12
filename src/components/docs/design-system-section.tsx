import React from 'react';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

interface DesignSystemSectionProps extends React.HTMLAttributes<HTMLElement> {
    title: string;
    description?: string;
}

export function DesignSystemSection({
    title,
    description,
    children,
    className,
    ...props
}: DesignSystemSectionProps) {
    return (
        <section className={cn("space-y-6", className)} {...props}>
            <div className="space-y-1 pb-3 border-b border-[var(--color-border-default)]">
                <Typography variant="heading-2">
                    {title}
                </Typography>
                {description && (
                    <Typography variant="body-base" className="text-[var(--color-text-secondary)]">
                        {description}
                    </Typography>
                )}
            </div>
            <div className="space-y-6">
                {children}
            </div>
        </section>
    );
}
