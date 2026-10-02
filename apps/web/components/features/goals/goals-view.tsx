'use client';

import type { GoalSummary } from '@spendtogether/schemas';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { GoalCard } from '@/components/ui/goal-card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { goalCardData } from '@/lib/insights';
import { useCouple, useCurrencies, useGoals, useToday } from '@/lib/queries';
import { useUrlParam } from '@/lib/url-state';

// SCR-15 Goals (F9-01, F9-02). My goals / Our goals in the URL; active goals as cards
// (one column on phones, two on tablets, three on desktops, §21), completed ones in a
// collapsed section. Our goals without a partner, or without shared goals, says what to
// do next (FR-13).

const primaryLink =
  'inline-flex min-h-(--touch-min) items-center rounded-md bg-action-primary-bg px-4 type-label text-action-primary-fg hover:bg-action-primary-bg-hover';

export function GoalsView() {
  const [tab, setTab] = useUrlParam<'mine' | 'ours'>('tab', ['mine', 'ours'], 'mine');
  const goals = useGoals(tab);
  const couple = useCouple();
  const today = useToday();
  const { byCode } = useCurrencies();
  const connected = couple.data?.status === 'active';
  const createHref = tab === 'ours' ? '/goals/new?type=couple' : '/goals/new';

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl
        label="Goals"
        value={tab}
        onValueChange={setTab}
        options={[
          { value: 'mine', label: 'My goals' },
          { value: 'ours', label: 'Our goals' },
        ]}
      />
      {(tab === 'mine' || connected) && (
        <Link href={createHref} className={primaryLink}>
          {tab === 'ours' ? 'Create shared goal' : 'Create goal'}
        </Link>
      )}
    </div>
  );

  let body;
  if (goals.isPending || (tab === 'ours' && couple.isPending)) {
    body = <LoadingSkeleton shape="goal-card" count={3} label="Loading goals" />;
  } else if (goals.isError) {
    body = (
      <ErrorState
        message="We couldn't load your goals."
        onRetry={() => void goals.refetch()}
        retrying={goals.isFetching}
      />
    );
  } else {
    const active = goals.data.filter((g) => g.completed_at === null);
    const completed = goals.data.filter((g) => g.completed_at !== null);
    const card = (g: GoalSummary) => (
      <li key={g.id}>
        <GoalCard href={`/goals/${g.id}`} goal={goalCardData(g, today, byCode.get(g.currency))} />
      </li>
    );
    if (goals.data.length === 0) {
      body =
        tab === 'mine' ? (
          <EmptyState
            title="You have no savings goals yet"
            body={'A goal turns "I should save" into a number and a date.'}
            action={
              <Link href="/goals/new" className={primaryLink}>
                Create goal
              </Link>
            }
          />
        ) : connected ? (
          <EmptyState
            title="No shared goals yet"
            body={`You and ${couple.data?.partner?.name ?? 'your partner'} can save toward something together.`}
            action={
              <Link href="/goals/new?type=couple" className={primaryLink}>
                Create shared goal
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Save for shared goals together"
            body="Connect a partner to create goals you both contribute to."
            action={
              <Link href="/couple" className={primaryLink}>
                Connect partner
              </Link>
            }
          />
        );
    } else {
      body = (
        <div className="flex flex-col gap-6">
          {active.length > 0 ? (
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{active.map(card)}</ul>
          ) : (
            <p className="type-body-lg text-fg-body">Every goal here is complete.</p>
          )}
          {completed.length > 0 && (
            <details className="group rounded-lg border border-border-default bg-bg-card">
              <summary className="flex min-h-(--touch-min) cursor-pointer list-none items-center justify-between gap-2 px-4 type-label text-fg-default">
                Completed goals ({completed.length})
                <ChevronDown
                  aria-hidden
                  className="size-(--icon-md) transition-transform duration-(--dur-fast) group-open:rotate-180"
                  strokeWidth={1.75}
                />
              </summary>
              <ul className="grid gap-4 p-4 pt-0 md:grid-cols-2 lg:grid-cols-3">
                {completed.map(card)}
              </ul>
            </details>
          )}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={goals.isFetching || undefined}>
      {header}
      {body}
    </div>
  );
}
