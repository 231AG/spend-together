'use client';

import { useCallback, useState } from 'react';

// Validation after blur, not on every keystroke (SCR-04), and everything after a submit
// attempt. Once a field has been shown an error it re-validates as the person types, so
// the message disappears as soon as it's fixed.

export function useBlurValidation<K extends string>(validate: (field: K) => string | null) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [submitted, setSubmitted] = useState(0);

  const errorFor = useCallback(
    (field: K): string | undefined => {
      if (!touched[field] && submitted === 0) return undefined;
      return validate(field) ?? undefined;
    },
    [touched, submitted, validate],
  );

  const blur = useCallback((field: K) => {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  }, []);

  /** Mark a submit attempt; returns the fields that are still invalid. */
  const attempt = useCallback(
    (fields: readonly K[]): K[] => {
      setSubmitted((n) => n + 1);
      return fields.filter((f) => validate(f) !== null);
    },
    [validate],
  );

  return { errorFor, blur, attempt, submitted };
}
