'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { identifierKind } from '@/lib/auth-input';

// The "Email or phone" field (SCR-04/05): detects the format as it's typed and switches
// the keyboard and autocomplete hint to match, so password managers and phone keypads
// both behave.

export function IdentifierInput({
  fieldId,
  value,
  onValueChange,
  onBlur,
  error,
  mode,
  label = 'Email or phone',
}: {
  fieldId: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  error?: ReactNode;
  /** `signin` uses `username` so managers match the saved account. */
  mode: 'signup' | 'signin';
  label?: string;
}) {
  const kind = identifierKind(value);
  const autoComplete = mode === 'signin' ? 'username' : kind === 'phone' ? 'tel' : 'email';
  return (
    <Input
      fieldId={fieldId}
      label={label}
      hint="Phone numbers start with the country code, like +231."
      type={kind === 'phone' ? 'tel' : 'text'}
      inputMode={kind === 'phone' ? 'tel' : 'email'}
      autoComplete={autoComplete}
      autoCapitalize="none"
      spellCheck={false}
      value={value}
      onChange={(e) => {
        onValueChange(e.target.value);
      }}
      onBlur={onBlur}
      {...(error ? { error } : {})}
    />
  );
}
