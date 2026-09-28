'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useId } from 'react';
import { FilterChip } from '@/components/ui/filter-chip';
import {
  PeriodSelector,
  SegmentedControl,
  type HomePeriod,
} from '@/components/ui/segmented-control';
import { useUrlParam, useUrlText } from '@/lib/url-state';

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

const KINDS = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
  { value: 'contribution', label: 'Savings contributions' },
] as const;
type Kind = 'all' | (typeof KINDS)[number]['value'];

export function ActivityFilters() {
  const [kind, setKind] = useUrlParam<Kind>(
    'type',
    ['all', 'income', 'expense', 'contribution'],
    'all',
  );
  const [q, setQ] = useUrlText('q');
  const [from, setFrom] = useUrlText('from');
  const [to, setTo] = useUrlText('to');
  const params = useSearchParams();
  const searchId = useId();
  const fromId = useId();
  const toId = useId();
  const input =
    'min-h-(--touch-min) rounded-md border border-border-input bg-bg-card px-3 type-body-lg text-fg-default';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={searchId} className="type-label text-fg-default">
          Search activity
        </label>
        <input
          id={searchId}
          type="search"
          data-shortcut-search=""
          // `/` from anywhere lands here with ?focus=search (§12.2).
          autoFocus={params.get('focus') === 'search'}
          defaultValue={q}
          placeholder="Notes or categories"
          onChange={(e) => {
            setQ(e.target.value);
          }}
          className={input}
        />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
        <FilterChip
          label="All"
          selected={kind === 'all'}
          onClick={() => {
            setKind('all');
          }}
        />
        {KINDS.map((k) => (
          <FilterChip
            key={k.value}
            label={k.label}
            selected={kind === k.value}
            onClick={() => {
              setKind(k.value);
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fromId} className="type-label text-fg-default">
            From
          </label>
          <input
            id={fromId}
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
            }}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={toId} className="type-label text-fg-default">
            To
          </label>
          <input
            id={toId}
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
            }}
            className={input}
          />
        </div>
      </div>
    </div>
  );
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
