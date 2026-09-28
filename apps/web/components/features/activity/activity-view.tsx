'use client';

import { addDays } from '@spendtogether/domain';
import { endpoints } from '@spendtogether/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { TransactionRow } from '@/components/ui/transaction-row';
import { useAddSheet } from '@/components/features/add-sheet';
import { apiClient } from '@/lib/api-client';
import { formatDay } from '@/lib/format-date';
import { useCategories, useCurrencies, useMe, useToday } from '@/lib/queries';
import { groupByDate, itemHref, toRowData } from '@/lib/transactions';
import { useUrlParam, useUrlText } from '@/lib/url-state';
import { activityKey, type ActivityFilters } from '../transactions/use-transaction-mutations';

// SCR-12 Activity (FR-09, F7-05/06/10). Filters and search live in the URL (reload,
// Back and sharing keep them). Date-grouped rows, 50 per page, with a sentinel that loads
// more on scroll and a real "Load more" button for keyboard and screen-reader users.

const PAGE = 50;
const KINDS = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
  { value: 'contribution', label: 'Savings contributions' },
] as const;
type Kind = 'all' | (typeof KINDS)[number]['value'];

/** Waits for typing to pause before searching. */
function useDebounced(value: string, ms: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => {
      setSettled(value);
    }, ms);
    return () => {
      clearTimeout(t);
    };
  }, [value, ms]);
  return settled;
}

const inputClass =
  'min-h-(--touch-min) w-full rounded-md border border-border-input bg-bg-card px-3 type-body-lg text-fg-default';

export function ActivityView({ selectedId }: { selectedId?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [kind, setKind] = useUrlParam<Kind>(
    'type',
    ['all', 'income', 'expense', 'contribution'],
    'all',
  );
  const [q, setQ] = useUrlText('q');
  const [category, setCategory] = useUrlText('category');
  const [from, setFrom] = useUrlText('from');
  const [to, setTo] = useUrlText('to');
  const searchRef = useRef<HTMLInputElement>(null);
  const ids = { search: useId(), category: useId(), from: useId(), to: useId() };

  const categories = useCategories('all');
  const search = useDebounced(q.trim(), 250);
  const filters: ActivityFilters = {
    ...(kind !== 'all' ? { kind } : {}),
    ...(category ? { category_id: category } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(search ? { q: search } : {}),
  };
  const filtered = Object.keys(filters).length > 0 || q.trim() !== '';

  function clearFilters() {
    if (searchRef.current) searchRef.current.value = '';
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.search} className="type-label text-fg-default">
            Search activity
          </label>
          <input
            ref={searchRef}
            id={ids.search}
            type="search"
            data-shortcut-search=""
            // `/` from anywhere lands here with ?focus=search (§12.2).
            autoFocus={params.get('focus') === 'search'}
            defaultValue={q}
            placeholder="Notes or categories"
            onChange={(e) => {
              setQ(e.target.value);
            }}
            className={inputClass}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.category} className="type-label text-fg-default">
              Category
            </label>
            <select
              id={ids.category}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
              }}
              className={inputClass}
            >
              <option value="">All categories</option>
              {(['expense', 'income'] as const).map((type) => (
                <optgroup key={type} label={type === 'expense' ? 'Expenses' : 'Income'}>
                  {(categories.data ?? [])
                    .filter((c) => c.type === type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.from} className="type-label text-fg-default">
              From
            </label>
            <input
              id={ids.from}
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.to} className="type-label text-fg-default">
              To
            </label>
            <input
              id={ids.to}
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
              }}
              className={inputClass}
            />
          </div>
        </div>
        {filtered && (
          <Button variant="ghost" className="self-start" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
      <ActivityList
        filters={filters}
        filtered={filtered}
        onClear={clearFilters}
        {...(selectedId ? { selectedId } : {})}
      />
    </div>
  );
}

function ActivityList({
  filters,
  filtered,
  onClear,
  selectedId,
}: {
  filters: ActivityFilters;
  filtered: boolean;
  onClear: () => void;
  selectedId?: string;
}) {
  const me = useMe();
  const today = useToday();
  const currencies = useCurrencies();
  const params = useSearchParams();
  const { openAdd } = useAddSheet();
  const sentinel = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: activityKey(filters),
    queryFn: ({ pageParam }) =>
      apiClient.call(endpoints.getActivity, {
        query: { ...filters, limit: PAGE, ...(pageParam ? { cursor: pageParam } : {}) },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const base = me.data?.base_currency ?? 'USD';
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const search = params.toString();

  if (query.isPending) return <LoadingSkeleton shape="row" count={8} label="Loading activity" />;
  if (query.isError && items.length === 0) {
    return (
      <ErrorState
        message="We couldn't load your activity."
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }
  if (items.length === 0) {
    return filtered ? (
      <EmptyState
        title="No activity matches these filters"
        body="Try a different search or date range."
        action={<Button onClick={onClear}>Clear filters</Button>}
      />
    ) : (
      <EmptyState
        title="Nothing recorded yet"
        body="Add your first income or expense and it will appear here."
        action={
          <Button
            onClick={() => {
              openAdd();
            }}
          >
            Add
          </Button>
        }
      />
    );
  }

  const dayLabel = (date: string) =>
    date === today
      ? 'Today'
      : today && date === addDays(today, -1)
        ? 'Yesterday'
        : formatDay(date, 'en-GB', today !== null && date.slice(0, 4) !== today.slice(0, 4));

  return (
    <div className="flex flex-col gap-4">
      {query.isError && (
        // Previous results stay; the failure is a banner (§19.2).
        <ErrorState
          variant="banner"
          message="We couldn't refresh your activity."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      )}
      {groupByDate(items).map((group) => (
        <section key={group.date} aria-label={dayLabel(group.date)} className="flex flex-col gap-1">
          <h2 className="px-2 type-overline text-fg-muted">{dayLabel(group.date)}</h2>
          <ul className="flex flex-col">
            {group.items.map((item) => (
              <li key={item.id}>
                <TransactionRow
                  row={toRowData(item, currencies.byCode)}
                  baseCurrency={base}
                  href={itemHref(item, search)}
                  current={item.id === selectedId}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hasNextPage && (
        <div ref={sentinel} className="flex justify-center">
          <Button
            variant="secondary"
            loading={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
