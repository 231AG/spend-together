import { roundPct1 } from '@spendtogether/domain';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/format-date';
import { formatMoney, type MoneyDisplay } from '@/lib/format-money';
import { ProgressBar } from './progress-bar';
import { StatusChip, type GoalStatus } from './status-chip';

// Spec §14.3 GoalCard: name, saved of target, ProgressBar, %, date and StatusChip.
// A card is itself a list item in the goals list (§18.2), and one link.

export interface GoalCardData {
  name: string;
  type: 'individual' | 'couple';
  saved: MoneyDisplay;
  target: MoneyDisplay;
  /** F-13, full precision. */
  progressPct: number;
  targetDate: string;
  status: GoalStatus;
  overdue?: boolean;
}

export interface GoalCardProps {
  goal: GoalCardData;
  href: string;
  compact?: boolean;
  locale?: string;
}

export function GoalCard({ goal, href, compact = false, locale }: GoalCardProps) {
  const saved = formatMoney(goal.saved);
  const target = formatMoney(goal.target);
  // Display rounding from the domain (§6.1): one decimal, ties away from zero.
  const pct = `${String(roundPct1(goal.progressPct))}%`;
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border-default bg-bg-card shadow-elev-1 hover:border-border-input',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex flex-col">
          <span className="type-label text-fg-default">{goal.name}</span>
          {goal.type === 'couple' && (
            <span className="type-caption text-fg-muted">Shared goal</span>
          )}
        </span>
        <StatusChip status={goal.status} overdue={goal.overdue ?? false} />
      </span>
      <span className="num type-body-sm text-fg-body">
        <span className="type-label text-fg-default">{saved}</span> of {target}
      </span>
      <ProgressBar
        value={goal.progressPct}
        label={`${goal.name} progress`}
        valueText={`${pct} saved, ${saved} of ${target}`}
      />
      {!compact && (
        <span className="flex items-center justify-between type-caption text-fg-muted">
          <span className="num">{pct}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
            By {formatShortDate(goal.targetDate, locale)}
          </span>
        </span>
      )}
    </Link>
  );
}
