'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PeriodSelector,
  SegmentedControl,
  type HomePeriod,
} from '@/components/ui/segmented-control';
import { useUrlParam } from '@/lib/url-state';

// URL-bound view state for the route map (F5-01): every filter and view switch lives in
// the query string, so it survives reload, Back and sharing. The screens that own these
// controls (F7–F9) reuse the same hooks.

export function HomePeriodControl() {
  const [period, setPeriod] = useUrlParam<HomePeriod>(
    'period',
    ['today', 'week', 'month'],
    'month',
  );
  return <PeriodSelector value={period} onValueChange={setPeriod} />;
}

export function InsightsPeriodControl() {
  const [period, setPeriod] = useUrlParam<'daily' | 'weekly' | 'monthly'>(
    'period',
    ['daily', 'weekly', 'monthly'],
    'monthly',
  );
  const params = useSearchParams();
  const date = params.get('date');
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        label="Insights period"
        value={period}
        onValueChange={setPeriod}
        options={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />
      {date && <p className="type-body-sm text-fg-muted">Showing the period containing {date}.</p>}
    </div>
  );
}

export function GoalsTabs() {
  const [tab, setTab] = useUrlParam<'mine' | 'ours'>('tab', ['mine', 'ours'], 'mine');
  return (
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
      <Link
        href={tab === 'ours' ? '/goals/new?type=couple' : '/goals/new'}
        className="inline-flex min-h-(--touch-min) items-center rounded-md bg-action-primary-bg px-4 type-label text-action-primary-fg hover:bg-action-primary-bg-hover"
      >
        Create goal
      </Link>
    </div>
  );
}

export function GoalTypeControl() {
  const [type, setType] = useUrlParam<'individual' | 'couple'>(
    'type',
    ['individual', 'couple'],
    'individual',
  );
  return (
    <SegmentedControl
      label="Goal type"
      value={type}
      onValueChange={setType}
      options={[
        { value: 'individual', label: 'Just me' },
        { value: 'couple', label: 'With my partner' },
      ]}
    />
  );
}

/** Close control for a full-page form (the dialog version closes with Back). */
export function CancelLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-(--touch-min) items-center rounded-md border border-border-input bg-bg-card px-4 type-label text-fg-default hover:bg-bg-subtle"
    >
      Cancel
    </Link>
  );
}
