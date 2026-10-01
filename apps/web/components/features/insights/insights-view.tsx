'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { track } from '@/lib/analytics';
import {
  comparedTo,
  donutSlices,
  isLatestPeriod,
  money,
  periodTitle,
  seriesPoints,
  stepPeriod,
  type InsightsPeriod,
} from '@/lib/insights';
import { useCategories, useCurrencies, useInsights, useToday } from '@/lib/queries';
import { useUrlParam, useUrlText } from '@/lib/url-state';
import { MetricCardRow } from './metric-card-row';

// SCR-14 Insights (FR-11, F8-06…F8-13). Period and date live in the URL; one request
// feeds every card and chart, so they always agree. Charts load on demand (Recharts is
// the heaviest dependency; Home needs none).

const chartFallback = () => <LoadingSkeleton shape="card" label="Loading chart" />;
const SpendingTrendChart = dynamic(() => import('../charts/spending-trend-chart'), {
  ssr: false,
  loading: chartFallback,
});
const IncomeExpenseChart = dynamic(() => import('../charts/income-expense-chart'), {
  ssr: false,
  loading: chartFallback,
});
const CategoryDonut = dynamic(() => import('../charts/category-donut'), {
  ssr: false,
  loading: chartFallback,
});

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export function InsightsView() {
  const [period, setPeriod] = useUrlParam<InsightsPeriod>(
    'period',
    ['daily', 'weekly', 'monthly'],
    'monthly',
  );
  const [date, setDate] = useUrlText('date');
  const today = useToday();
  const insights = useInsights(period, date || null);
  const currencies = useCurrencies();
  const categories = useCategories('all');

  useEffect(() => {
    track({ name: 'insights_viewed', props: { period } });
  }, [period]);

  const colorOf = useMemo(() => {
    const byId = new Map((categories.data ?? []).map((c) => [c.id, c.color] as const));
    return (id: string) => byId.get(id) ?? 'cat-other';
  }, [categories.data]);

  const control = (
    <SegmentedControl
      label="Insights period"
      value={period}
      onValueChange={(next) => {
        setPeriod(next);
      }}
      options={PERIODS}
    />
  );

  if (insights.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {control}
        <LoadingSkeleton shape="card" count={2} label="Loading insights" />
      </div>
    );
  }
  if (insights.isError) {
    return (
      <div className="flex flex-col gap-6">
        {control}
        <ErrorState
          message="We couldn't load your insights."
          onRetry={() => void insights.refetch()}
          retrying={insights.isFetching}
        />
      </div>
    );
  }

  const data = insights.data;
  const { currency } = data;
  const meta = currencies.byCode.get(currency);
  const asMoney = (amountMinor: number) => money(amountMinor, currency, meta);
  const points = seriesPoints(data.series);
  // Labels and steps follow the data on screen: while a new period loads, the previous
  // response stays visible and must keep describing itself, not the requested period.
  const shown = data.period.type;
  // Unknown "today" is treated as the latest period, so nothing steps into the future.
  const isCurrent = today === null || data.period.end >= today;
  const previousStart = stepPeriod(shown, data.period.start, -1);
  const nextStart = stepPeriod(shown, data.period.start, 1);
  const title = periodTitle(shown, data.period.start);

  return (
    <div className="flex flex-col gap-6" aria-busy={insights.isFetching || undefined}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {control}
        <div className="flex items-center gap-1" role="group" aria-label="Choose period">
          <IconButton
            label={`Previous: ${periodTitle(shown, previousStart)}`}
            icon={<ChevronLeft />}
            onClick={() => {
              setDate(previousStart);
            }}
          />
          <h2 className="min-w-48 text-center type-h3 text-fg-default" aria-live="polite">
            {title}
          </h2>
          <IconButton
            label={
              isCurrent
                ? 'Next period (this is the latest)'
                : `Next: ${periodTitle(period, stepPeriod(period, data.period.start, 1))}`
            }
            icon={<ChevronRight />}
            disabled={isCurrent}
            onClick={() => {
              // The period holding today is the default view: no date in the URL for it.
              setDate(isLatestPeriod(shown, nextStart, today) ? '' : nextStart);
            }}
          />
        </div>
      </div>

      <MetricCardRow data={data} comparedTo={comparedTo(shown, previousStart)} money={asMoney} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SpendingTrendChart
          points={points}
          bucket={data.series.bucket}
          currency={currency}
          money={asMoney}
        />
        <IncomeExpenseChart points={points} currency={currency} money={asMoney} />
      </div>
      <CategoryDonut
        slices={donutSlices(data.categories, colorOf)}
        total={data.totals.expenses}
        period={data.period}
        currency={currency}
        money={asMoney}
      />
    </div>
  );
}
