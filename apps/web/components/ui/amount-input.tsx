'use client';

import { Info } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { entryFromMinor, readEntry, sanitiseEntry } from '@/lib/amount-entry';
import { cn } from '@/lib/cn';
import {
  tooSmallMessage,
  type ConversionPreview,
  type CurrencyInfo,
} from '@/lib/conversion-preview';
import { ESTIMATED_RATE_NOTE, formatApprox } from '@/lib/format-money';
import { Field, controlClass } from './field';

// Spec §14.3 AmountInput, the most important control in the product. Decimal keypad,
// the currency's own exponent, 16 px text, and the live ≈ conversion line, including
// ADR-005's too-small message before Save.

export interface AmountInputProps {
  label: string;
  /** Minor units, or null when empty. */
  value: number | null;
  onValueChange: (minor: number | null) => void;
  currency: CurrencyInfo;
  /** A CurrencyPicker (or a static code) rendered inside the field. */
  currencySlot?: ReactNode;
  /** Computed by the caller with `previewConversion`. */
  preview?: ConversionPreview;
  error?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  name?: string;
}

function entryError(kind: string, currency: CurrencyInfo): string | null {
  if (kind === 'too-many-decimals') {
    return currency.exponent === 0
      ? `${currency.code} has no decimal places.`
      : `${currency.code} allows ${currency.exponent} decimal places.`;
  }
  if (kind === 'invalid') return 'Enter an amount using digits only.';
  return null;
}

function PreviewLine({ preview }: { preview: ConversionPreview | undefined }) {
  if (!preview || preview.status === 'same') return null;
  if (preview.status === 'too-small')
    return <span className="text-fg-error">{tooSmallMessage(preview.baseCurrency)}</span>;
  if (preview.status === 'unavailable')
    return <span>Conversion to {preview.baseCurrency} will be shown when rates load.</span>;
  return (
    <span className="inline-flex items-center gap-1 num">
      {formatApprox(preview.base)}
      {preview.estimated && (
        <span className="inline-flex items-center gap-1">
          <Info aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
          <span>{ESTIMATED_RATE_NOTE}</span>
        </span>
      )}
    </span>
  );
}

export function AmountInput({
  label,
  value,
  onValueChange,
  currency,
  currencySlot,
  preview,
  error,
  hint,
  disabled,
  name,
}: AmountInputProps) {
  const [text, setText] = useState(() => entryFromMinor(value, currency.exponent));
  const [entryProblem, setEntryProblem] = useState<string | null>(null);

  function handleChange(raw: string) {
    const next = sanitiseEntry(raw);
    setText(next);
    const result = readEntry(next, currency.exponent);
    setEntryProblem(entryError(result.kind, currency));
    onValueChange(result.kind === 'ok' ? result.minor : null);
  }

  const shownError = error ?? entryProblem;
  const tooSmall = preview?.status === 'too-small';

  return (
    <Field
      label={label}
      hint={hint}
      error={shownError ?? undefined}
      footer={preview && preview.status !== 'same' ? <PreviewLine preview={preview} /> : undefined}
    >
      {({ id, describedBy, invalid }) => (
        <div className="flex items-stretch gap-2">
          {currencySlot ?? (
            <span className="inline-flex min-h-(--touch-min) items-center rounded-md bg-bg-subtle px-3 type-label text-fg-default">
              {currency.code}
            </span>
          )}
          <input
            id={id}
            name={name}
            type="text"
            inputMode={currency.exponent === 0 ? 'numeric' : 'decimal'}
            autoComplete="off"
            enterKeyHint="done"
            placeholder={currency.exponent === 0 ? '0' : `0.${'0'.repeat(currency.exponent)}`}
            value={text}
            disabled={disabled}
            onChange={(e) => {
              handleChange(e.target.value);
            }}
            aria-describedby={describedBy}
            aria-invalid={invalid || tooSmall || undefined}
            className={cn(controlClass, 'num text-right')}
          />
        </div>
      )}
    </Field>
  );
}
