'use client';

import { RadioGroup } from 'radix-ui';
import { cn } from '@/lib/cn';

// Spec §14.3 PeriodSelector / SegmentedControl: role="radiogroup", arrow keys move the
// selection, Tab leaves the group. Inactive labels use fg-body, never fg-muted: muted text
// on the subtle track fails contrast (decision D-16).

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
}

export interface SegmentedControlProps<V extends string> {
  label: string;
  options: readonly SegmentOption<V>[];
  value: V;
  onValueChange: (value: V) => void;
  className?: string;
}

export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<V>) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        const match = options.find((o) => o.value === next);
        if (match) onValueChange(match.value);
      }}
      orientation="horizontal"
      loop
      className={cn('inline-flex rounded-full bg-bg-subtle p-1', className)}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'min-h-9 rounded-full px-4 type-label text-fg-body',
            'transition-colors duration-(--dur-fast) ease-standard',
            'data-[state=checked]:bg-bg-card data-[state=checked]:text-fg-default data-[state=checked]:shadow-elev-1',
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

export type HomePeriod = 'today' | 'week' | 'month';

const HOME_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const satisfies readonly SegmentOption<HomePeriod>[];

/** The Home period selector (§12.1 `?period=today|week|month`). */
export function PeriodSelector({
  value,
  onValueChange,
  className,
}: {
  value: HomePeriod;
  onValueChange: (value: HomePeriod) => void;
  className?: string;
}) {
  return (
    <SegmentedControl
      label="Period"
      options={HOME_PERIODS}
      value={value}
      onValueChange={onValueChange}
      {...(className ? { className } : {})}
    />
  );
}
