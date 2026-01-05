'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DropdownMenu = Popover;

const DropdownMenuTrigger = PopoverTrigger;

const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof PopoverContent>,
    React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, align = 'end', ...props }, ref) => (
    <PopoverContent
        ref={ref}
        align={align}
        className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-background-primary)] p-1 text-[var(--color-text-primary)] shadow-[var(--shadow-md)]',
            className
        )}
        {...props}
    />
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
    const itemStyles = 'relative flex cursor-pointer select-none items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-sm outline-none transition-colors focus:bg-[var(--color-background-tertiary)] focus:text-[var(--color-text-primary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-[var(--color-background-tertiary)]';

    // If asChild is true, we need to clone the child to add the className and other props
    if (asChild && React.isValidElement(props.children)) {
        const child = props.children as React.ReactElement<{ className?: string }>;
        return React.cloneElement(child, {
            className: cn(itemStyles, className, child.props.className),
        });
    }

    return (
        <div
            ref={ref}
            className={cn(itemStyles, className)}
            {...props}
        />
    );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
};
