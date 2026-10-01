'use client';

import Link from 'next/link';
import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/chart-container';
import { formatMoney, type MoneyDisplay } from '@/lib/format-money';
import { categoryActivityHref, pctLabel, type DonutSlice } from '@/lib/insights';
import { DONUT_SIZE, TooltipCard, cssVar, useChartMotion } from './chart-kit';

// C-01 Category breakdown (F8-08): a donut at 60% inner radius with the total in the
// centre, and a legend listing every slice's amount and share, sorted by amount — top six
// plus "Other categories". Each colour sits beside its name; the legend rows open
// Activity filtered by that category and period.

export interface DonutProps {
  slices: DonutSlice[];
  total: number;
  period: { start: string; end: string };
  currency: string;
  money: (amountMinor: number) => MoneyDisplay;
}

export default function CategoryDonut({ slices, total, period, currency, money }: DonutProps) {
  const motion = useChartMotion();
  const totalText = formatMoney(money(total));
  return (
    <ChartContainer
      title="Where your money went"
      description={`Expenses by category · ${currency}`}
      table={{
        caption: `Expenses by category, in ${currency}. Total ${totalText}.`,
        columns: ['Category', 'Amount', 'Share'],
        rows: slices.map((s) => [s.name, formatMoney(money(s.amount)), pctLabel(s.pct)]),
      }}
    >
      {slices.length === 0 ? (
        <p className="type-body-sm text-fg-muted">No spending recorded in this period.</p>
      ) : (
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="relative shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  // Recharts 3 reads each slice's paint from its own `fill` (Cell is deprecated).
                  data={slices.map((s) => ({ ...s, fill: cssVar(s.color) }))}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="100%"
                  stroke={cssVar('bg-card')}
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                  {...motion}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    const s = payload[0]?.payload as DonutSlice | undefined;
                    if (!active || !s) return null;
                    return (
                      <TooltipCard
                        title={s.name}
                        rows={[
                          {
                            label: pctLabel(s.pct),
                            value: formatMoney(money(s.amount)),
                            swatch: cssVar(s.color),
                          },
                        ]}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="type-caption text-fg-muted">Total</span>
              <span className="num type-label text-fg-default">{totalText}</span>
            </div>
          </div>
          <ul className="flex w-full flex-col">
            {slices.map((s) => {
              const amount = formatMoney(money(s.amount));
              const pct = pctLabel(s.pct);
              const content = (
                <>
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: cssVar(s.color) }}
                  />
                  <span className="flex-1 type-body-sm text-fg-default">{s.name}</span>
                  <span className="num type-label text-fg-default">{amount}</span>
                  <span className="num w-14 text-right type-body-sm text-fg-muted">{pct}</span>
                </>
              );
              return (
                <li key={s.id ?? 'rest'}>
                  {s.id ? (
                    <Link
                      href={categoryActivityHref(s.id, period.start, period.end)}
                      aria-label={`${s.name}: ${amount}, ${pct}. Show these expenses`}
                      className="flex min-h-(--touch-min) items-center gap-3 rounded-md px-2 hover:bg-bg-subtle"
                    >
                      {content}
                    </Link>
                  ) : (
                    <span className="flex min-h-(--touch-min) items-center gap-3 px-2">
                      {content}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ChartContainer>
  );
}
