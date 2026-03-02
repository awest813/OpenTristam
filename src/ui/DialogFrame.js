import React from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusableElements(container) {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

export default function DialogFrame({
  children,
  className,
  role = 'dialog',
  modal = true,
  trapFocus = true,
  onEscape,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}) {
  const containerRef = React.useRef(null);
  const previousFocusRef = React.useRef(null);

  React.useLayoutEffect(() => {
    previousFocusRef.current = document.activeElement;
    const container = containerRef.current;
    if (container) {
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    }

    return () => {
      const prev = previousFocusRef.current;
      if (prev && prev.isConnected && prev.focus) {
        prev.focus();
      }
    };
  }, []);

  const handleKeyDown = React.useCallback(event => {
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape(event);
      return;
    }

    if (!trapFocus || event.key !== 'Tab') {
      return;
    }

    const container = containerRef.current;
    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      if (container) {
        container.focus();
      }
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === container || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last || active === container || !container.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }, [onEscape, trapFocus]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const isDialogRole = role === 'dialog' || role === 'alertdialog';

  return (
    <div
      className={className}
      role={role}
      aria-modal={isDialogRole ? modal : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      ref={containerRef}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
