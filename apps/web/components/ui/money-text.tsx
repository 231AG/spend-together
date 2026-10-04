import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  ESTIMATED_RATE_NOTE,
  formatApprox,
  formatMoney,
  type MoneyDisplay,
} from '@/lib/format-money';

// An amount as §11.4 and §17.2 require: tabular figures, the ISO code for non-base
// currencies, the ≈ base line underneath, an info note for estimated rates, and never
// truncated with an ellipsis (it wraps instead).

export type MoneyKind = 'income' | 'expense' | 'saving' | 'neutral';

export interface MoneyTextProps {
  money: MoneyDisplay;
  baseCurrency?: string;
  kind?: MoneyKind;
  /** The amount in base currency when `money` is not in base. */
  base?: MoneyDisplay;
  estimated?: boolean;
  /**
   * §11.2: an offline entry's ≈ line is the device's estimate from cached rates; the
   * server's conversion replaces it on sync. Labelled in words, not only by an icon.
   */
  provisional?: boolean;
  className?: string;
}

const TONE: Record<MoneyKind, string> = {
  income: 'text-income',
  expense: 'text-expense',
  saving: 'text-saving',
  neutral: 'text-fg-default',
};

export function MoneyText({
  money,
  baseCurrency,
  kind = 'neutral',
  base,
  estimated = false,
  provisional = false,
  className,
}: MoneyTextProps) {
  const sign = kind === 'income' ? 'income' : kind === 'expense' ? 'expense' : 'auto';
  const text = formatMoney(money, { sign, ...(baseCurrency ? { baseCurrency } : {}) });
  return (
    <span className={cn('inline-flex flex-col items-end break-words', className)}>
      <span className={cn('num type-label', TONE[kind])}>
        {text}
        {kind === 'saving' && <span className="type-body-sm"> saved</span>}
      </span>
      {base && (
        <span className="inline-flex items-center gap-1 num type-caption text-fg-muted">
          {formatApprox(base)}
          {provisional && <span> (estimate)</span>}
          {estimated && !provisional && (
            <span title={ESTIMATED_RATE_NOTE} className="inline-flex">
              <Info aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
              <span className="sr-only">{ESTIMATED_RATE_NOTE}</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
