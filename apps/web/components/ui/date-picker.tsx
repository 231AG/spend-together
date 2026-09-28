'use client';

import { addDays } from '@spendtogether/domain';
import type { ReactNode } from 'react';
import { Field, controlClass } from './field';
import { FilterChip } from './filter-chip';

// Spec §14.3 DatePicker. A native date input on every viewport: phones get the system
// wheel, desktop browsers their own calendar popover (decision D-23). `max` is today in
// the user's time zone (BR-09), passed in; the component never reads the clock.

export interface DatePickerProps {
  label: string;
  value: string;
  onValueChange: (date: string) => void;
  /** Today in the user's time zone (`YYYY-MM-DD`). */
  today: string;
  /** Earliest allowed date, if any. */
  min?: string;
  error?: ReactNode;
  disabled?: boolean;
}

export function DatePicker({
  label,
  value,
  onValueChange,
  today,
  min,
  error,
  disabled,
}: DatePickerProps) {
  const yesterday = addDays(today, -1);
  return (
    <Field label={label} error={error}>
      {({ id, describedBy, invalid }) => (
        <div className="flex flex-col gap-2">
          <input
            id={id}
            type="date"
            value={value}
            max={today}
            min={min}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              // Browsers let people type past `max`; clamp so a future date is never set.
              const next = e.target.value;
              if (next === '' || next > today) return;
              onValueChange(next);
            }}
            className={controlClass}
          />
          <div className="flex gap-2" role="group" aria-label={`${label} shortcuts`}>
            <FilterChip
              label="Today"
              selected={value === today}
              onClick={() => {
                onValueChange(today);
              }}
              disabled={disabled}
            />
            <FilterChip
              label="Yesterday"
              selected={value === yesterday}
              onClick={() => {
                onValueChange(yesterday);
              }}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </Field>
  );
}
