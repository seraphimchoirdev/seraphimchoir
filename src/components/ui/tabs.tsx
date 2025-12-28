'use client';

import * as React from 'react';

interface TabsContextValue {
    value: string;
    onValueChange?: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps {
    value: string;
    onValueChange?: (value: string) => void;
    className?: string;
    children: React.ReactNode;
}

export function Tabs({ value, onValueChange, className = '', children }: TabsProps) {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div className={className}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export interface TabsListProps {
    className?: string;
    children: React.ReactNode;
}

export function TabsList({ className = '', children }: TabsListProps) {
    return (
        <div
            className={`inline-flex items-center justify-center rounded-lg bg-[var(--color-background-tertiary)] p-1 ${className}`}
            style={{
                border: '1px solid var(--color-border-default)',
            }}
        >
            {children}
        </div>
    );
}

export interface TabsTriggerProps {
    value: string;
    className?: string;
    children: React.ReactNode;
}

export function TabsTrigger({ value, className = '', children }: TabsTriggerProps) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error('TabsTrigger must be used within Tabs');

    const isActive = context.value === value;

    return (
        <button
            type="button"
            onClick={() => context.onValueChange?.(value)}
            className={`
        inline-flex items-center justify-center whitespace-nowrap
        px-4 py-2 rounded-md
        text-sm font-medium
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:ring-offset-2
        ${isActive
                    ? 'bg-white text-[var(--color-primary-600)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/50'
                }
        ${className}
      `}
        >
            {children}
        </button>
    );
}

export interface TabsContentProps {
    value: string;
    className?: string;
    children: React.ReactNode;
}

export function TabsContent({ value, className = '', children }: TabsContentProps) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error('TabsContent must be used within Tabs');

    if (context.value !== value) return null;

    return (
        <div className={className}>
            {children}
        </div>
    );
}
