'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart-container';
import { formatAxisMoney, formatMoney, type MoneyDisplay } from '@/lib/format-money';
import { hasEnoughBuckets, perBucket, trendAverage, type BucketPoint } from '@/lib/insights';
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

// C-02 Spending trend (F8-09): expenses per bucket — 14 days, 8 weeks or 6 months — as a
// 2 px line from a zero baseline, dots on hover and focus, and a dashed line at the
// average of the plotted buckets (D-68). Keyboard: Recharts' accessibility layer moves
// between points with the arrow keys and shows each tooltip; screen readers get the table.

export interface TrendProps {
  points: BucketPoint[];
  bucket: 'day' | 'week' | 'month';
  currency: string;
  money: (amountMinor: number) => MoneyDisplay;
}

export default function SpendingTrendChart({ points, bucket, currency, money }: TrendProps) {
  const motion = useChartMotion();
  const metrics = chartMetrics();
  const axis = axisProps(metrics.tickSize);
  const avg = trendAverage(points);
  const avgLabel = `avg ${formatMoney(money(avg))}${perBucket(bucket)}`;
  const span =
    bucket === 'day' ? 'last 14 days' : bucket === 'week' ? 'last 8 weeks' : 'last 6 months';
  const enough = hasEnoughBuckets(points, 'expenses');
  return (
    <ChartContainer
      title="Spending trend"
      description={`Expenses, ${span} · ${currency}`}
      table={{
        caption: `Spending per ${bucket}, ${span}, in ${currency}. Average ${avgLabel}.`,
        columns: ['Period', 'Spending'],
        rows: points.map((p) => [p.range, formatMoney(money(p.expenses))]),
      }}
    >
      {enough ? (
        <div className="flex flex-col gap-3">
          <SeriesLegend
            items={[
              { label: 'Spending', color: cssVar('chart-expense') },
              { label: avgLabel, color: cssVar('chart-axis'), dashed: true },
            ]}
          />
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke={cssVar('chart-grid')} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
              <YAxis
                {...axis}
                axisLine={false}
                width={56}
                domain={[0, 'auto']}
                tickFormatter={(v: number) => formatAxisMoney(money(v))}
              />
              <Tooltip
                cursor={{ stroke: cssVar('chart-axis'), strokeDasharray: '2 4' }}
                content={({ active, payload }) => {
                  const p = payload[0]?.payload as BucketPoint | undefined;
                  if (!active || !p) return null;
                  return (
                    <TooltipCard
                      title={p.range}
                      rows={[
                        {
                          label: 'Spending',
                          value: formatMoney(money(p.expenses)),
                          swatch: cssVar('chart-expense'),
                        },
                      ]}
                    />
                  );
                }}
              />
              <ReferenceLine
                y={avg}
                stroke={cssVar('chart-axis')}
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Spending"
                stroke={cssVar('chart-expense')}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: cssVar('bg-card'),
                  strokeWidth: 2,
                  fill: cssVar('chart-expense'),
                }}
                {...motion}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <MinimumData>
          <p className="num type-body-sm text-fg-body">
            {points
              .filter((p) => p.expenses > 0)
              .map((p) => `${p.range}: ${formatMoney(money(p.expenses))}`)
              .join(' · ') || 'No spending recorded yet.'}
          </p>
        </MinimumData>
      )}
    </ChartContainer>
  );
}
