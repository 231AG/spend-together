import { Check } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// Spec §14.3 FilterChip: a toggle with aria-pressed. Selected state shows a check icon as
// well as the tint, so it never relies on colour alone.

export interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  selected: boolean;
}

export function FilterChip({
  label,
  selected,
  className,
  type = 'button',
  ...rest
}: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-(--touch-min) items-center gap-1.5 rounded-full border px-3 type-label',
        'transition-colors duration-(--dur-fast) ease-standard',
        'disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)',
        selected
          ? 'border-action-primary-bg bg-bg-selected text-action-secondary-fg'
          : 'border-border-input bg-bg-card text-fg-default enabled:hover:bg-bg-subtle',
        className,
      )}
      {...rest}
    >
      {selected && <Check aria-hidden className="size-(--icon-sm)" strokeWidth={2} />}
      {label}
    </button>
  );
}
