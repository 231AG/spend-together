import { Tooltip } from 'radix-ui';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Spec §14.3 IconButton: `label` is required and becomes both the accessible name and the
// tooltip, so an icon is never the only explanation of an action.

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  icon: ReactNode;
  label: string;
  variant?: 'ghost' | 'tertiary' | 'primary';
  /**
   * Off for a dialog's close button: it receives focus on open, and a tooltip opened by
   * that focus would swallow the first Esc meant for the dialog.
   */
  tooltip?: boolean;
}

const VARIANTS = {
  ghost: 'bg-transparent text-fg-default enabled:hover:bg-bg-subtle',
  tertiary: 'bg-bg-card text-fg-default border border-border-input enabled:hover:bg-bg-subtle',
  primary: 'bg-action-primary-bg text-action-primary-fg enabled:hover:bg-action-primary-bg-hover',
} as const;

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  tooltip = true,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-grid size-(--touch-min) shrink-0 place-items-center rounded-full',
        'transition-colors duration-(--dur-fast) ease-standard',
        'disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <span aria-hidden className="inline-grid size-(--icon-md) place-items-center">
        {icon}
      </span>
    </button>
  );
  if (!tooltip) return button;
  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-(--z-toast) rounded-sm bg-neutral-900 px-2 py-1 type-caption text-fg-on-action shadow-elev-2"
          >
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
