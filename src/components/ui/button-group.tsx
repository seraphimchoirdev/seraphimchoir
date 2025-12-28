'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ButtonGroupItem {
    label: string;
    value: string;
    disabled?: boolean;
}

interface ButtonGroupProps {
    items: ButtonGroupItem[];
    value: string;
    onChange: (value: string) => void;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
    size?: 'sm' | 'default' | 'lg';
    className?: string;
    disabled?: boolean;
}

export function ButtonGroup({
    items,
    value,
    onChange,
    variant = 'outline',
    size = 'default',
    className,
    disabled = false,
}: ButtonGroupProps) {
    return (
        <div className={cn('inline-flex rounded-md shadow-sm', className)} role="group">
            {items.map((item, index) => {
                const isSelected = value === item.value;
                const isFirst = index === 0;
                const isLast = index === items.length - 1;

                return (
                    <Button
                        key={item.value}
                        type="button"
                        variant={isSelected ? 'default' : variant}
                        size={size}
                        disabled={disabled || item.disabled}
                        onClick={() => onChange(item.value)}
                        className={cn(
                            'rounded-none border-l-0 first:border-l',
                            isFirst && 'rounded-l-md',
                            isLast && 'rounded-r-md',
                            isSelected && 'z-10 relative',
                            !isSelected && variant === 'outline' && 'bg-white hover:bg-[var(--color-background-tertiary)]',
                            className
                        )}
                    >
                        {item.label}
                    </Button>
                );
            })}
        </div>
    );
}
