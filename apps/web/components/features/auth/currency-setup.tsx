'use client';

import { endpoints } from '@spendtogether/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormNotice } from '@/components/ui/form-message';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { apiClient } from '@/lib/api-client';
import { COPY, authProblem } from '@/lib/auth-copy';
import { allTimeZones, currencyForLocale, detectTimeZone } from '@/lib/auth-input';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/connectivity';
import { queryKeys } from '@/lib/queries';
import { safeNext } from '@/lib/safe-next';

// SCR-07 Currency setup (FR-05). A searchable list (code and name) pre-selected from the
// browser locale, the detected time zone with Change, and Continue → PATCH /me → /home.
// The list is a native radio group: arrow keys move, and the choice is announced.

export function CurrencySetup() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const online = useOnline();
  const currencies = useQuery({
    queryKey: ['currencies'],
    queryFn: () => apiClient.call(endpoints.listCurrencies, {}),
    select: (res) => res.data.filter((c) => c.is_active),
  });
  const [chosen, setChosen] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [timeZone, setTimeZone] = useState(detectTimeZone);
  const [changingZone, setChangingZone] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const searchId = useId();
  const zoneId = useId();
  const listLabelId = useId();

  const offered = useMemo(() => currencies.data?.map((c) => c.code) ?? [], [currencies.data]);
  const selected =
    chosen ??
    (offered.length > 0
      ? currencyForLocale(
          typeof navigator === 'undefined' ? undefined : navigator.language,
          offered,
        )
      : null);

  const save = useMutation({
    mutationFn: () =>
      apiClient.call(endpoints.patchMe, {
        body: { base_currency: selected ?? 'USD', timezone: timeZone, onboarded: true },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.replace(safeNext(params.get('next')));
    },
    onError: (error) => {
      const p = authProblem(error);
      setProblem(p.kind === 'offline' ? COPY.offline : COPY.generic);
    },
  });

  const q = query.trim().toLowerCase();
  const visible = (currencies.data ?? []).filter(
    (c) => q === '' || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="type-body-lg text-fg-body">
        Your totals and insights are shown in this currency. You can still enter amounts in any
        currency.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={searchId} className="type-label text-fg-default">
          Search currencies
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-(--icon-md) -translate-y-1/2 text-fg-muted"
            strokeWidth={1.75}
          />
          <input
            id={searchId}
            type="search"
            autoComplete="off"
            value={query}
            placeholder="Code or name"
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            className="w-full min-h-(--touch-min) rounded-md border border-border-input bg-bg-card pl-10 pr-3 type-body-lg text-fg-default placeholder:text-fg-muted"
          />
        </div>
      </div>

      {currencies.isPending ? (
        <LoadingSkeleton shape="row" count={5} label="Loading currencies" />
      ) : currencies.isError ? (
        <FormNotice tone="error">
          We couldn't load the currency list.{' '}
          <button type="button" className="underline" onClick={() => void currencies.refetch()}>
            Retry
          </button>
        </FormNotice>
      ) : (
        <fieldset className="flex flex-col gap-1">
          <legend id={listLabelId} className="sr-only">
            Base currency
          </legend>
          {visible.length === 0 && (
            <p role="status" className="type-body-sm text-fg-muted">
              No currency matches “{query}”.
            </p>
          )}
          <div className="flex max-h-(--popover-max-h) flex-col gap-1 overflow-y-auto">
            {visible.map((c) => {
              const on = c.code === selected;
              return (
                <label
                  key={c.code}
                  className={cn(
                    'flex min-h-(--touch-min) cursor-pointer items-center gap-3 rounded-md px-3 hover:bg-bg-subtle',
                    'has-[:focus-visible]:focus-ring',
                    on && 'bg-bg-selected',
                  )}
                >
                  <input
                    type="radio"
                    name="base-currency"
                    value={c.code}
                    checked={on}
                    onChange={() => {
                      setChosen(c.code);
                    }}
                    className="sr-only"
                  />
                  <span className="w-12 type-label text-fg-default">{c.code}</span>
                  <span className="flex-1 type-body-lg text-fg-body">{c.name}</span>
                  {on && (
                    <Check aria-hidden className="size-(--icon-md) text-fg-link" strokeWidth={2} />
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-card p-4">
        <p className="type-body-sm text-fg-body">
          Time zone: <span className="type-label text-fg-default">{timeZone}</span>{' '}
          {timeZone === detectTimeZone() && <span className="text-fg-muted">(detected)</span>}
        </p>
        {changingZone ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={zoneId} className="type-label text-fg-default">
              Time zone
            </label>
            <select
              id={zoneId}
              value={timeZone}
              onChange={(e) => {
                setTimeZone(e.target.value);
              }}
              className="min-h-(--touch-min) rounded-md border border-border-input bg-bg-card px-3 type-body-lg text-fg-default"
            >
              {allTimeZones(timeZone).map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </div>
        ) : (
          <button
            type="button"
            className="self-start type-label text-fg-link underline"
            onClick={() => {
              setChangingZone(true);
            }}
          >
            Change time zone
          </button>
        )}
      </div>

      {!online && <FormNotice tone="offline">{COPY.offline}</FormNotice>}
      {problem && online && <FormNotice tone="error">{problem}</FormNotice>}
      <Button
        size="lg"
        block
        loading={save.isPending}
        disabled={!online || selected === null}
        onClick={() => {
          setProblem(null);
          save.mutate();
        }}
      >
        Continue
      </Button>
    </div>
  );
}
