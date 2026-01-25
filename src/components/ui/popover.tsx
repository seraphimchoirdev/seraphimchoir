'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined);

export interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  // Controlled mode: use props, Uncontrolled mode: use internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled) {
        onOpenChange?.(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    },
    [isControlled, onOpenChange]
  );

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
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

  const internalRef = React.useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    context.setOpen(!context.open);
  };

  // Store ref to trigger element for position calculation
  React.useEffect(() => {
    if (asChild) {
      // For asChild, we need to find the actual element
      // This will be set via the cloned element's ref
    } else if (internalRef.current) {
      context.triggerRef.current = internalRef.current;
    }
  });

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      onClick?: (e: React.MouseEvent) => void;
      ref?: React.Ref<HTMLElement>;
    }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        handleClick(e);
      },
      ref: (el: HTMLElement | null) => {
        context.triggerRef.current = el;
        // Forward the original ref if it exists
        const originalRef = child.props.ref;
        if (typeof originalRef === 'function') {
          originalRef(el);
        } else if (originalRef && typeof originalRef === 'object') {
          (originalRef as React.MutableRefObject<HTMLElement | null>).current = el;
        }
      },
    });
  }

  return (
    <button ref={internalRef} type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

export interface PopoverContentProps {
  className?: string;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className = '', children, align = 'center', sideOffset = 8 }, forwardedRef) => {
    const context = React.useContext(PopoverContext);
    if (!context) throw new Error('PopoverContent must be used within Popover');

    const internalRef = React.useRef<HTMLDivElement>(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const [mounted, setMounted] = React.useState(false);

    // Merge refs
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    // Handle client-side mounting for Portal
    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Calculate position based on trigger element
    React.useEffect(() => {
      if (!context.open || !context.triggerRef.current) return;

      const updatePosition = () => {
        const triggerRect = context.triggerRef.current?.getBoundingClientRect();
        if (!triggerRect) return;

        const contentEl = ref.current;
        const contentWidth = contentEl?.offsetWidth || 200;

        let left: number;
        switch (align) {
          case 'start':
            left = triggerRect.left;
            break;
          case 'end':
            left = triggerRect.right - contentWidth;
            break;
          case 'center':
          default:
            left = triggerRect.left + triggerRect.width / 2 - contentWidth / 2;
            break;
        }

        // Ensure the popover doesn't go off-screen
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const contentHeight = contentEl?.offsetHeight || 0;

        // Horizontal bounds check
        if (left < 8) left = 8;
        if (left + contentWidth > viewportWidth - 8) {
          left = viewportWidth - contentWidth - 8;
        }

        // Calculate top position (below trigger by default)
        let top = triggerRect.bottom + sideOffset;

        // If not enough space below, position above
        if (top + contentHeight > viewportHeight - 8) {
          top = triggerRect.top - contentHeight - sideOffset;
        }

        setPosition({ top, left });
      };

      updatePosition();

      // Update position on scroll or resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [context.open, context.triggerRef, align, sideOffset, ref]);

    // Handle click outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const element = ref.current;
        const triggerElement = context.triggerRef.current;

        // Don't close if clicking on trigger (toggle will handle it)
        if (triggerElement?.contains(event.target as Node)) {
          return;
        }

        if (element && !element.contains(event.target as Node)) {
          context.setOpen(false);
        }
      };

      if (context.open) {
        // Use setTimeout to avoid immediate trigger from the click that opened it
        const timeoutId = setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
          clearTimeout(timeoutId);
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [context.open, context, ref]);

    // Handle escape key
    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          context.setOpen(false);
        }
      };

      if (context.open) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [context.open, context]);

    if (!context.open || !mounted) return null;

    const content = (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 9999,
        }}
        className={`min-w-[200px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-background-primary)] shadow-[var(--shadow-md)] ${className}`}
      >
        {children}
      </div>
    );

    // Render to document.body via Portal to escape overflow:hidden containers
    return createPortal(content, document.body);
  }
);
PopoverContent.displayName = 'PopoverContent';
