import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { roundPct1 } from '@spendtogether/domain';
import { cn } from '@/lib/cn';
import { formatMoney, type MoneyDisplay } from '@/lib/format-money';

// Spec §14.3 SummaryMetric / MetricCard and C-05/C-06. Numbers use tabular figures; a
// delta chip carries an arrow icon and signed text, never colour alone. Savings rate N/A
// (income 0, AC05) shows "N/A" with its explanation instead of 0 or ∞.

export interface Delta {
  /** Full-precision change from the domain; null means the previous value was 0 ("New"). */
  value: number | null;
  unit: 'pct' | 'pts';
  /** "vs Aug". */
  comparedTo: string;
  /** Whether an increase is good (income, saved) or bad (expenses). */
  increaseIs: 'good' | 'bad';
}

export type MetricValue =
  { kind: 'money'; money: MoneyDisplay } | { kind: 'pct'; value: number | null; naReason?: string };

export interface MetricCardProps {
  label: string;
  value: MetricValue;
  delta?: Delta;
  icon?: ReactNode;
  emphasis?: 'default' | 'hero';
  className?: string;
}

/** Display rounding only (§6.1): the value arrives in full precision. */
function round1(n: number): string {
  return roundPct1(Math.abs(n)).toFixed(1);
}

export function DeltaChip({ delta }: { delta: Delta }) {
  if (delta.value === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2 py-0.5 type-caption text-fg-body">
        <Sparkles aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
        New {delta.comparedTo}
      </span>
    );
  }
  const shown = round1(delta.value);
  const flat = shown === '0.0';
  const up = delta.value > 0;
  const good = flat ? null : up ? delta.increaseIs === 'good' : delta.increaseIs === 'bad';
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const sign = flat ? '' : up ? '+' : '−';
  const unit = delta.unit === 'pct' ? '%' : ' pts';
  const word = flat ? 'No change' : up ? 'Up' : 'Down';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 type-caption num',
        good === null && 'bg-bg-subtle text-fg-body',
        good === true && 'bg-status-ontrack-bg text-status-ontrack-fg',
        good === false && 'bg-status-behind-bg text-status-behind-fg',
      )}
    >
      <Icon aria-hidden className="size-(--icon-sm)" strokeWidth={2} />
      <span className="sr-only">{word} </span>
      {flat ? `0.0${unit}` : `${sign}${shown}${unit}`} {delta.comparedTo}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  icon,
  emphasis = 'default',
  className,
}: MetricCardProps) {
  const hero = emphasis === 'hero';
  let shown: string;
  let na: string | undefined;
  if (value.kind === 'money') {
    shown = formatMoney(value.money);
  } else if (value.value === null) {
    shown = 'N/A';
    na = value.naReason ?? 'No income recorded in this period.';
  } else {
    shown = `${round1(value.value)}%`;
    if (value.value < 0) shown = `−${shown}`;
  }
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="inline-flex items-center gap-1.5 type-body-sm text-fg-muted">
        {icon && (
          <span aria-hidden className="inline-grid">
            {icon}
          </span>
        )}
        {label}
      </span>
      <span
        className={cn('num break-words text-fg-default', hero ? 'type-num-display' : 'type-label')}
      >
        {shown}
      </span>
      {na && <span className="type-caption text-fg-muted">{na}</span>}
      {delta && (
        <span>
          <DeltaChip delta={delta} />
        </span>
      )}
    </div>
  );
}
