'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart-container';
import { formatAxisMoney, formatMoney, type MoneyDisplay } from '@/lib/format-money';
import { hasEnoughBuckets, type BucketPoint } from '@/lib/insights';
import { MD_UP, useMediaQuery } from '@/lib/use-media-query';
import {
  axisProps,
  chartMetrics,
  CHART_HEIGHT,
  MinimumData,
  SeriesLegend,
  TooltipCard,
  cssVar,
  useChartMotion,
} from './chart-kit';

// C-03 Income vs expenses (F8-10): grouped bars, income left and expenses right, the last
// three buckets on mobile and six from 768 px, value labels above bars from 768 px. One
// axis from zero; the legend names both series (never colour alone).

export interface IncomeExpenseProps {
  points: BucketPoint[];
  currency: string;
  money: (amountMinor: number) => MoneyDisplay;
}

export default function IncomeExpenseChart({ points, currency, money }: IncomeExpenseProps) {
  const motion = useChartMotion();
  const metrics = chartMetrics();
  const axis = axisProps(metrics.tickSize);
  const wide = useMediaQuery(MD_UP);
  const shown = points.slice(wide ? -6 : -3);
  const enough = hasEnoughBuckets(shown, 'both');
  // Labels match the tooltip and table exactly (never rounded).
  const label = (v: unknown) => (typeof v === 'number' ? formatMoney(money(v)) : '');
  return (
    <ChartContainer
      title="Income vs expenses"
      description={`Last ${String(shown.length)} periods · ${currency}`}
      table={{
        caption: `Income and expenses per period, in ${currency}.`,
        columns: ['Period', 'Income', 'Expenses'],
        rows: shown.map((p) => [
          p.range,
          formatMoney(money(p.income)),
          formatMoney(money(p.expenses)),
        ]),
      }}
    >
      {enough ? (
        <div className="flex flex-col gap-3">
          <SeriesLegend
            items={[
              { label: 'Income', color: cssVar('chart-income') },
              { label: 'Expenses', color: cssVar('chart-expense') },
            ]}
          />
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart
              data={shown}
              margin={{ top: 20, right: 8, bottom: 0, left: 0 }}
              barGap={2}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke={cssVar('chart-grid')} />
              <XAxis dataKey="label" {...axis} />
              <YAxis
                {...axis}
                axisLine={false}
                width={56}
                domain={[0, 'auto']}
                tickFormatter={(v: number) => formatAxisMoney(money(v))}
              />
              <Tooltip
                cursor={{ fill: cssVar('bg-subtle') }}
                content={({ active, payload }) => {
                  const p = payload[0]?.payload as BucketPoint | undefined;
                  if (!active || !p) return null;
                  return (
                    <TooltipCard
                      title={p.range}
                      rows={[
                        {
                          label: 'Income',
                          value: formatMoney(money(p.income)),
                          swatch: cssVar('chart-income'),
                        },
                        {
                          label: 'Expenses',
                          value: formatMoney(money(p.expenses)),
                          swatch: cssVar('chart-expense'),
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="income"
                name="Income"
                fill={cssVar('chart-income')}
                radius={metrics.barRadius}
                {...motion}
              >
                {wide && (
                  <LabelList
                    dataKey="income"
                    position="top"
                    formatter={label}
                    fill={cssVar('fg-body')}
                    fontSize={metrics.tickSize}
                  />
                )}
              </Bar>
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill={cssVar('chart-expense')}
                radius={metrics.barRadius}
                {...motion}
              >
                {wide && (
                  <LabelList
                    dataKey="expenses"
                    position="top"
                    formatter={label}
                    fill={cssVar('fg-body')}
                    fontSize={metrics.tickSize}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <MinimumData>
          <p className="num type-body-sm text-fg-body">
            {shown
              .filter((p) => p.income > 0 || p.expenses > 0)
              .map(
                (p) =>
                  `${p.range}: income ${formatMoney(money(p.income))}, expenses ${formatMoney(money(p.expenses))}`,
              )
              .join(' · ') || 'Nothing recorded yet.'}
          </p>
        </MinimumData>
      )}
    </ChartContainer>
  );
}
