import { AlertTriangle, ArrowDownLeft, ArrowUpRight, PiggyBank, Percent } from 'lucide-react';
import Link from 'next/link';
import type { HomeSummaryResponse } from '@spendtogether/schemas';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/cn';
import { formatMoney, type MoneyDisplay } from '@/lib/format-money';
import { insightsHrefFor, periodPhrase, type HomePeriod } from '@/lib/insights';

// F8-01 (SCR-08, FR-10): the period's position without a chart. The dominant figure is
// Remaining Cash Flow (F-04) — never the boards' invented number — with Income,
// Expenses, Saved and Savings rate beneath and net cash flow (F-05) as a secondary line.
// The base currency code appears once, in the card header (§11.4).

export function SummaryHeroCard({
  summary,
  period,
  money,
  pendingNote,
}: {
  summary: HomeSummaryResponse;
  period: HomePeriod;
  money: (amountMinor: number) => MoneyDisplay;
  /** §19.2: queued entries applied locally to these figures. */
  pendingNote?: string;
}) {
  const { totals, currency } = summary;
  const overspent = totals.remaining < 0;
  const phrase = periodPhrase(period);
  const href = insightsHrefFor(period);
  const metric = 'rounded-md p-2 -m-2 hover:bg-bg-subtle focus-visible:focus-ring';
  return (
    <section
      aria-labelledby="hero-title"
      className="flex flex-col gap-5 rounded-xl bg-bg-card p-5 shadow-elev-1 md:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="hero-title" className="type-body-sm text-fg-muted">
          {overspent ? `Overspent ${phrase}` : `Remaining ${phrase}`} · {currency}
        </h2>
        <p
          className={cn(
            'inline-flex items-center gap-2 num type-num-display break-words',
            overspent ? 'text-expense' : 'text-fg-default',
          )}
        >
          {overspent && <AlertTriangle aria-hidden className="size-(--icon-lg)" strokeWidth={2} />}
          {formatMoney(money(totals.remaining))}
        </p>
        <p className="num type-body-sm text-fg-body">
          Net cash flow {formatMoney(money(totals.net))} · after {formatMoney(money(totals.saved))}{' '}
          saved
        </p>
        {pendingNote && <p className="type-body-sm text-fg-muted">{pendingNote}</p>}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-4">
        <li>
          <Link href={href} className={cn('block', metric)}>
            <MetricCard
              label="Income"
              icon={<ArrowDownLeft className="size-(--icon-sm) text-income" strokeWidth={2} />}
              value={{ kind: 'money', money: money(totals.income) }}
            />
          </Link>
        </li>
        <li>
          <Link href={href} className={cn('block', metric)}>
            <MetricCard
              label="Expenses"
              icon={<ArrowUpRight className="size-(--icon-sm) text-expense" strokeWidth={2} />}
              value={{ kind: 'money', money: money(totals.expenses) }}
            />
          </Link>
        </li>
        <li>
          <Link href={href} className={cn('block', metric)}>
            <MetricCard
              label="Saved"
              icon={<PiggyBank className="size-(--icon-sm) text-saving" strokeWidth={2} />}
              value={{ kind: 'money', money: money(totals.saved) }}
            />
          </Link>
        </li>
        <li>
          <Link href={href} className={cn('block', metric)}>
            <MetricCard
              label="Savings rate"
              icon={<Percent className="size-(--icon-sm) text-fg-muted" strokeWidth={2} />}
              value={{
                kind: 'pct',
                value: totals.savings_rate_pct,
                naReason: `No income recorded ${phrase}, so there is no rate yet.`,
              }}
            />
          </Link>
        </li>
      </ul>
    </section>
  );
}
