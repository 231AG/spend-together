'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GoalCard } from '@/components/ui/goal-card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { TransactionRow } from '@/components/ui/transaction-row';
import { useAddSheet } from '@/components/features/add-sheet';
import { goalCardData, money, type HomePeriod } from '@/lib/insights';
import { useCategories, useCurrencies, useHomeSummary, useMe, useToday } from '@/lib/queries';
import { itemHref, toRowData } from '@/lib/transactions';
import { useUrlParam } from '@/lib/url-state';
import { SpendingPreview, type CategoryLook } from './spending-preview';
import { SummaryHeroCard } from './summary-hero-card';

// SCR-08 Home (FR-10, F8-01…F8-05). One request per period (`/home/summary`); the period
// lives in the URL. Mobile stacks hero → spending → goals (W-02); from 1024 px the hero
// and spending sit side by side with goals and recent activity below (W-01).

export function HomeView() {
  const [period] = useUrlParam<HomePeriod>('period', ['today', 'week', 'month'], 'month');
  const summary = useHomeSummary(period);
  const me = useMe();
  const today = useToday();
  const currencies = useCurrencies();
  const categories = useCategories('all');
  const { openAdd } = useAddSheet();

  const looks = useMemo(
    () =>
      new Map<string, CategoryLook>(
        (categories.data ?? []).map((c) => [c.id, { icon: c.icon, color: c.color }]),
      ),
    [categories.data],
  );

  if (summary.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <LoadingSkeleton shape="card" label="Loading your summary" />
        <LoadingSkeleton shape="row" count={5} />
      </div>
    );
  }
  if (summary.isError) {
    return (
      <ErrorState
        message="We couldn't load your summary."
        onRetry={() => void summary.refetch()}
        retrying={summary.isFetching}
      />
    );
  }

  const data = summary.data;
  const base = data.currency;
  const meta = currencies.byCode.get(base);
  const asMoney = (amountMinor: number) => money(amountMinor, base, meta);
  const firstRun =
    data.recent.length === 0 &&
    data.goals.length === 0 &&
    data.totals.income === 0 &&
    data.totals.expenses === 0;

  if (firstRun) {
    return (
      <EmptyState
        title={`Welcome${me.data ? `, ${me.data.name}` : ''}`}
        body="Add your first income or expense and your remaining cash flow appears here."
        action={
          <Button
            onClick={() => {
              openAdd();
            }}
          >
            Add your first income or expense
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={summary.isFetching || undefined}>
      <div className="grid gap-6 lg:grid-cols-2">
        <SummaryHeroCard summary={data} period={period} money={asMoney} />
        <SpendingPreview summary={data} money={asMoney} looks={looks} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="goals-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="goals-title" className="type-h3 text-fg-default">
              Active goals
            </h2>
            <Link href="/goals" className="type-label text-fg-link underline">
              All goals
            </Link>
          </div>
          {data.goals.length === 0 ? (
            <EmptyState
              title="No active goals"
              body="Set a goal and see how close you are, on your own or with your partner."
              action={
                <Link href="/goals/new" className="type-label text-fg-link underline">
                  Create a goal
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.goals.map((g) => (
                <li key={g.id}>
                  <GoalCard
                    compact
                    href={`/goals/${g.id}`}
                    goal={goalCardData(g, today, currencies.byCode.get(g.currency))}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* Recent activity is a desktop extra (SCR-08); mobile has the Activity tab. */}
        <section aria-labelledby="recent-title" className="hidden flex-col gap-3 lg:flex">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="recent-title" className="type-h3 text-fg-default">
              Recent activity
            </h2>
            <Link href="/activity" className="type-label text-fg-link underline">
              All activity
            </Link>
          </div>
          <ul className="flex flex-col rounded-xl bg-bg-card p-2 shadow-elev-1">
            {data.recent.map((item) => (
              <li key={item.id}>
                <TransactionRow
                  row={toRowData(item, currencies.byCode)}
                  baseCurrency={base}
                  href={itemHref(item, '')}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
