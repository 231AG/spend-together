'use client';

import { Info, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CurrencyPicker } from '@/components/ui/currency-picker';
import { ErrorState } from '@/components/ui/error-state';
import { FormNotice } from '@/components/ui/form-message';
import { FxAttribution } from '@/components/ui/fx-attribution';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED } from '@/lib/couple';
import { useCurrencies, useMe, usePatchMe } from '@/lib/queries';

// Base currency (F11-03, F11-09; §7.10, §11.3, FR-22, WAC-15). A searchable picker, then
// an impact dialog that states the three facts of §11.3 step 1 and that goal currencies
// stay as they are (BR-15), before anything changes. Confirming starts the recalculation;
// the shell's banner takes over from there.

/** The §11.3 step 1 wording, verbatim apart from the currency code. */
export function impactFacts(code: string): string[] {
  return [
    `All your totals will be shown in ${code}.`,
    'Past entries are converted at the rate from their own dates.',
    'Your original amounts are kept.',
  ];
}

export const GOALS_UNCHANGED = "Your goals keep their own currencies. They don't change.";

export function CurrencySettings() {
  const me = useMe();
  const currencies = useCurrencies();
  const online = useOnline();
  const toast = useToast();
  const patch = usePatchMe();
  const [choice, setChoice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (me.isPending || currencies.isPending) {
    return <LoadingSkeleton shape="card" label="Loading currencies" />;
  }
  if (me.isError || currencies.isError) {
    return (
      <ErrorState
        message="We couldn't load your currency settings."
        onRetry={() => {
          void me.refetch();
          void currencies.refetch();
        }}
      />
    );
  }

  const base = me.data.base_currency;
  const selected = choice ?? base;
  const name = (code: string) => currencies.byCode.get(code)?.name ?? code;
  const recalculating = me.data.recalculating;
  const active = currencies.data.data.filter((c) => c.is_active);

  return (
    <div className="mx-auto flex w-full max-w-(--dialog-max) flex-col gap-6">
      <section
        aria-labelledby="currency-current"
        className="flex flex-col gap-1 rounded-lg border border-border-default bg-bg-card p-4"
      >
        <h2 id="currency-current" className="type-label text-fg-muted">
          Your base currency
        </h2>
        <p className="type-h3 text-fg-default">
          {base} · {name(base)}
        </p>
        <p className="type-body-sm text-fg-body">
          Totals, charts and summaries are shown in this currency. You can still enter amounts in
          any currency.
        </p>
      </section>

      {/* The shell's banner announces the update; this only explains the disabled picker. */}
      {recalculating && (
        <p className="flex items-center gap-2 type-body-sm text-fg-body">
          <RefreshCw aria-hidden className="spin size-(--icon-sm) shrink-0" strokeWidth={1.75} />
          You can change it again once your totals are updated.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <CurrencyPicker
          label="New base currency"
          value={selected}
          onValueChange={(code) => {
            setChoice(code);
            patch.reset();
          }}
          currencies={active}
          baseCurrency={base}
          disabled={!online || recalculating}
        />
        <p className="flex items-start gap-2 type-body-sm text-fg-body">
          <Info aria-hidden className="mt-0.5 size-(--icon-sm) shrink-0" strokeWidth={1.75} />
          {GOALS_UNCHANGED}
        </p>
        {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
        {patch.isError && (
          <FormNotice tone="error">We couldn&apos;t change your currency. Try again.</FormNotice>
        )}
        <Button
          className="self-start"
          disabled={!online || recalculating || selected === base}
          loading={patch.isPending}
          onClick={() => {
            setConfirming(true);
          }}
        >
          {selected === base ? 'Choose a new currency' : `Change to ${selected}`}
        </Button>
      </div>

      <FxAttribution />

      <ConfirmationDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Change your base currency to ${selected}?`}
        consequences={
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {impactFacts(selected).map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
            <li>{GOALS_UNCHANGED}</li>
          </ul>
        }
        confirmLabel={`Change to ${selected}`}
        onConfirm={() => {
          patch.mutate(
            { base_currency: selected },
            {
              onSuccess: () => {
                setChoice(null);
                toast({ message: `Base currency changed to ${selected}` });
              },
            },
          );
        }}
      />
    </div>
  );
}
