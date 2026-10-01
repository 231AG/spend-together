import { ArrowDownLeft, ArrowUpRight, CalendarDays, Percent, PiggyBank } from 'lucide-react';
import type { InsightsResponse } from '@spendtogether/schemas';
import { MetricCard } from '@/components/ui/metric-card';
import type { MoneyDisplay } from '@/lib/format-money';

// F8-07 (C-05, C-06): four metrics with previous-period deltas — arrow icon and signed
// text plus "vs Aug", "New" when the previous value was 0 (F-10). Savings rate changes in
// points, not percent. Average daily spending (F-07) follows as its own card (SCR-14).

export function MetricCardRow({
  data,
  comparedTo,
  money,
}: {
  data: InsightsResponse;
  comparedTo: string;
  money: (amountMinor: number) => MoneyDisplay;
}) {
  const { totals, change_pct: change } = data;
  const card = 'rounded-xl bg-bg-card p-4 shadow-elev-1';
  const icon = 'size-(--icon-sm)';
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <li className={card}>
        <MetricCard
          label="Income"
          icon={<ArrowDownLeft className={`${icon} text-income`} strokeWidth={2} />}
          value={{ kind: 'money', money: money(totals.income) }}
          delta={{ value: change.income, unit: 'pct', comparedTo, increaseIs: 'good' }}
        />
      </li>
      <li className={card}>
        <MetricCard
          label="Expenses"
          icon={<ArrowUpRight className={`${icon} text-expense`} strokeWidth={2} />}
          value={{ kind: 'money', money: money(totals.expenses) }}
          delta={{ value: change.expenses, unit: 'pct', comparedTo, increaseIs: 'bad' }}
        />
      </li>
      <li className={card}>
        <MetricCard
          label="Saved"
          icon={<PiggyBank className={`${icon} text-saving`} strokeWidth={2} />}
          value={{ kind: 'money', money: money(totals.saved) }}
          delta={{ value: change.saved, unit: 'pct', comparedTo, increaseIs: 'good' }}
        />
      </li>
      <li className={card}>
        <MetricCard
          label="Savings rate"
          icon={<Percent className={`${icon} text-fg-muted`} strokeWidth={2} />}
          value={{
            kind: 'pct',
            value: totals.savings_rate_pct,
            naReason: 'No income recorded in this period, so there is no rate yet.',
          }}
          {...(totals.savings_rate_pct !== null && data.previous.savings_rate_pct !== null
            ? {
                delta: {
                  value: change.savings_rate_pts,
                  unit: 'pts' as const,
                  comparedTo,
                  increaseIs: 'good' as const,
                },
              }
            : {})}
        />
      </li>
      <li className={`${card} col-span-2 lg:col-span-1`}>
        <MetricCard
          label="Average daily spending"
          icon={<CalendarDays className={`${icon} text-fg-muted`} strokeWidth={2} />}
          value={{ kind: 'money', money: money(totals.avg_daily_spending) }}
        />
      </li>
    </ul>
  );
}
