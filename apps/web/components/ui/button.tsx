import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Spec §14.3 Button. One primary per view region; destructive never uses the primary
// style (§18.2). Loading keeps the width, shows a spinner and sets aria-busy.

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  /** Stretch to the container width (mobile form actions). */
  block?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-action-primary-bg text-action-primary-fg enabled:hover:bg-action-primary-bg-hover',
  secondary: 'bg-action-secondary-bg text-action-secondary-fg enabled:hover:bg-primary-100',
  tertiary: 'bg-bg-card text-fg-default border border-border-input enabled:hover:bg-bg-subtle',
  destructive: 'bg-action-danger-bg text-action-danger-fg enabled:hover:bg-action-danger-bg-hover',
  ghost: 'bg-transparent text-fg-link enabled:hover:bg-bg-selected',
};

// md is the 44 px touch minimum (§18 touch-min); sm is for dense desktop toolbars only.
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 gap-1.5 type-label rounded-sm',
  md: 'min-h-(--touch-min) px-4 gap-2 type-label rounded-md',
  lg: 'min-h-12 px-6 gap-2 type-label rounded-md',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  block = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap select-none',
        'transition-colors duration-(--dur-fast) ease-standard',
        'disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)',
        loading && 'disabled:opacity-100',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {/* Content stays in the layout while loading so the width never changes. */}
      <span className={cn('inline-flex items-center gap-[inherit]', loading && 'invisible')}>
        {iconLeft}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <LoaderCircle aria-hidden className="spin size-(--icon-md)" strokeWidth={1.75} />
        </span>
      )}
    </button>
  );
}
