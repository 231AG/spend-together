import { cn } from '@/lib/cn';

// A link styled as a button (a navigation that looks like an action). One definition, so
// every "Create account", "Create goal" and "Add contribution" link stays identical to
// Button's own primary and tertiary styles.

const BASE = 'inline-flex items-center justify-center rounded-md px-4 type-label';
const VARIANT = {
  primary: 'bg-action-primary-bg text-action-primary-fg hover:bg-action-primary-bg-hover',
  secondary: 'border border-border-input bg-bg-card text-fg-default hover:bg-bg-subtle',
} as const;
const SIZE = { md: 'min-h-(--touch-min)', lg: 'min-h-12 px-6' } as const;

export function linkButton(
  variant: keyof typeof VARIANT = 'primary',
  size: keyof typeof SIZE = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANT[variant], SIZE[size], className);
}
