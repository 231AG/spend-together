import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Field, controlClass } from './field';

// Spec §14.3 Input: label always visible, error linked, 16 px text.

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Input({ label, hint, error, className, required, ...rest }: InputProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optional={required === false}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          className={controlClass}
          {...rest}
        />
      )}
    </Field>
  );
}

export interface TextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'value'
> {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  rows?: number;
  maxLength?: number;
  value?: string;
}

/** Textarea with a live character count when `maxLength` is set. */
export function Textarea({
  label,
  hint,
  error,
  className,
  maxLength,
  value,
  rows = 3,
  required,
  ...rest
}: TextareaProps) {
  const count =
    maxLength !== undefined ? `${(value ?? '').length} of ${maxLength} characters` : null;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optional={required === false}
      footer={count}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          maxLength={maxLength}
          value={value}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          className={cn(controlClass, 'py-2.5')}
          {...rest}
        />
      )}
    </Field>
  );
}
