'use client';

import * as React from 'react';

interface PopoverContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined);

export interface PopoverProps {
    children: React.ReactNode;
}

export function Popover({ children }: PopoverProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <PopoverContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block">
                {children}
            </div>
        </PopoverContext.Provider>
    );
}

export interface PopoverTriggerProps {
    asChild?: boolean;
    children: React.ReactNode;
}

export function PopoverTrigger({ asChild, children }: PopoverTriggerProps) {
    const context = React.useContext(PopoverContext);
    if (!context) throw new Error('PopoverTrigger must be used within Popover');

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        context.setOpen(!context.open);
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
        return React.cloneElement(child, {
            onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                handleClick(e);
            },
        });
    }

    return (
        <button type="button" onClick={handleClick}>
            {children}
        </button>
    );
}

export interface PopoverContentProps {
    className?: string;
    children: React.ReactNode;
    align?: 'start' | 'center' | 'end';
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
    ({ className = '', children, align = 'center' }, forwardedRef) => {
        const context = React.useContext(PopoverContext);
        if (!context) throw new Error('PopoverContent must be used within Popover');

        const internalRef = React.useRef<HTMLDivElement>(null);

        // Merge refs
        const ref = forwardedRef || internalRef;

        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                const element = typeof ref === 'function' ? null : ref.current;
                if (element && !element.contains(event.target as Node)) {
                    context.setOpen(false);
                }
            };

            if (context.open) {
                document.addEventListener('mousedown', handleClickOutside);
            }

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [context.open, context, ref]);

        if (!context.open) return null;

        const alignmentClass = {
            start: 'left-0',
            center: 'left-1/2 -translate-x-1/2',
            end: 'right-0',
        }[align];

        return (
            <div
                ref={ref}
                className={`
        absolute z-50 mt-2 min-w-[200px]
        rounded-lg bg-white
        ${alignmentClass}
        ${className}
      `}
                style={{
                    border: '1px solid var(--color-border-default)',
                    boxShadow: 'var(--shadow-md)',
                }}
            >
                {children}
            </div>
        );
    }
);
PopoverContent.displayName = 'PopoverContent';
