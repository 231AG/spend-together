'use client';

import { Picker, type PickerOption } from './picker';

// Spec §14.3 CurrencyPicker: searchable by code or name; base and recent pinned on top.

export interface CurrencyOption {
  code: string;
  name: string;
}

export interface CurrencyPickerProps {
  value: string;
  onValueChange: (code: string) => void;
  currencies: CurrencyOption[];
  baseCurrency: string;
  recent?: string[];
  label?: string;
  disabled?: boolean;
}

export function CurrencyPicker({
  value,
  onValueChange,
  currencies,
  baseCurrency,
  recent = [],
  label = 'Currency',
  disabled,
}: CurrencyPickerProps) {
  const options: PickerOption[] = currencies.map((c) => ({
    value: c.code,
    label: `${c.code} · ${c.name}`,
    keywords: c.code,
    ...(c.code === baseCurrency
      ? { trailing: <span className="type-caption text-fg-muted">Base</span> }
      : {}),
  }));
  const pinned = [baseCurrency, ...recent.filter((c) => c !== baseCurrency)];
  return (
    <Picker
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      pinned={pinned}
      searchLabel="Search currencies"
      renderValue={() => <span className="num">{value}</span>}
      {...(disabled !== undefined ? { disabled } : {})}
    />
  );
}
