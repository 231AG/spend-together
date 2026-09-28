'use client';

import { Check, Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Field, controlClass } from './field';

// Password field (SCR-04/05, §20, WCAG 3.3.8): show/hide toggle, paste allowed, the right
// autocomplete for password managers, and an optional live length hint.

export interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'type' | 'value' | 'onChange'
> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  autoComplete: 'new-password' | 'current-password';
  error?: ReactNode;
  /** Show the "at least N characters" hint with a live check (new passwords only). */
  minLength?: number;
  fieldId?: string;
}

export function PasswordInput({
  label,
  value,
  onValueChange,
  autoComplete,
  error,
  minLength,
  className,
  fieldId,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const longEnough = minLength !== undefined && value.length >= minLength;
  const hint =
    minLength === undefined ? undefined : (
      <span className="inline-flex items-center gap-1">
        {longEnough && (
          <Check aria-hidden className="size-(--icon-sm) text-fg-link" strokeWidth={2} />
        )}
        At least {minLength} characters
        {longEnough && <span className="sr-only"> (done)</span>}
      </span>
    );
  return (
    <Field id={fieldId} label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => {
              onValueChange(e.target.value);
            }}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            spellCheck={false}
            autoCapitalize="none"
            className={cn(controlClass, 'pr-14')}
            {...rest}
          />
          <button
            type="button"
            // A constant name; aria-pressed carries the state, and each field's toggle is
            // distinguishable ("Show confirm password").
            aria-pressed={visible}
            aria-label={`Show ${label.toLowerCase()}`}
            onClick={() => {
              setVisible((v) => !v);
            }}
            className="absolute inset-y-0 right-0 inline-grid w-(--touch-min) place-items-center rounded-r-md text-fg-body hover:bg-bg-subtle"
          >
            {visible ? (
              <EyeOff aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
            )}
          </button>
        </div>
      )}
    </Field>
  );
}
