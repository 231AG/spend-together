'use client';

import type { Contribution, GoalDetail } from '@spendtogether/schemas';
import { useId, useState, type SyntheticEvent } from 'react';
import { AmountInput } from '@/components/ui/amount-input';
import { Button } from '@/components/ui/button';
import { CurrencyPicker } from '@/components/ui/currency-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, controlClass } from '@/components/ui/field';
import { FormNotice } from '@/components/ui/form-message';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ProgressBar } from '@/components/ui/progress-bar';
import { entryFromMinor, readEntry } from '@/lib/amount-entry';
import { ApiError } from '@/lib/api-client';
import { celebrate } from '@/lib/celebration';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/connectivity';
import { previewConversion, tooSmallMessage } from '@/lib/conversion-preview';
import { formatMoney } from '@/lib/format-money';
import { afterThis, progressLabel } from '@/lib/goals';
import { useCurrencies, useMe, useRates, useToday } from '@/lib/queries';
import { crossRateFor } from '@/lib/transactions';
import { useCreateContribution, usePatchContribution } from './use-goal-mutations';

// SCR-18 add contribution (F9-09, FR-14) and the correction path (F9-10, FR-15). Goal
// context, amount with currency defaulting to the goal's, the ≈ goal-currency preview for
// any other currency, date, note and "After this: $650.00 saved · 54%", computed with the
// same domain functions the API uses so it equals the post-save state.

const NOTE_MAX = 280;

export interface ContributionFormProps {
  goal: GoalDetail;
  /** Edit mode. */
  initial?: Contribution;
  onSaved: (result: { goal: GoalDetail; completedNow: boolean }) => void;
}

export function ContributionForm(props: ContributionFormProps) {
  const me = useMe();
  const today = useToday();
  const currencies = useCurrencies();
  if (!me.data || !today || !currencies.data) {
    return <LoadingSkeleton shape="row" count={4} label="Loading the form" />;
  }
  return (
    <LoadedContributionForm
      {...props}
      base={me.data.base_currency}
      today={today}
      currencies={currencies.data.data.filter((c) => c.is_active)}
    />
  );
}

function LoadedContributionForm({
  goal,
  initial,
  onSaved,
  base,
  today,
  currencies,
}: ContributionFormProps & {
  base: string;
  today: string;
  currencies: { code: string; name: string; exponent: number; symbol: string }[];
}) {
  const online = useOnline();
  const noteId = useId();
  const meta = (code: string) =>
    currencies.find((c) => c.code === code) ?? { code, name: code, exponent: 2, symbol: code };

  const [currency, setCurrency] = useState(initial?.amount.currency ?? goal.currency);
  const [text, setText] = useState(() =>
    initial
      ? entryFromMinor(initial.amount.amount_minor, meta(initial.amount.currency).exponent)
      : '',
  );
  const [date, setDate] = useState(initial?.contribution_date ?? today);
  const [note, setNote] = useState(initial?.note ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const [clientId] = useState(() => crypto.randomUUID());

  const create = useCreateContribution(goal.id);
  const patch = usePatchContribution(goal.id);
  const saving = create.isPending || patch.isPending;

  const from = meta(currency);
  const goalMeta = meta(goal.currency);
  const entry = readEntry(text, from.exponent);
  const amount = entry.kind === 'ok' ? entry.minor : null;
  const foreign = currency !== goal.currency;
  const rates = useRates(date, foreign);
  const preview =
    foreign && amount !== null && amount > 0
      ? previewConversion({
          amountMinor: amount,
          from,
          base: goalMeta,
          rate: rates.isPending ? null : crossRateFor(rates.data?.rates, currency, goal.currency),
          estimated: rates.data?.estimated ?? false,
        })
      : undefined;
  const tooSmall = preview?.status === 'too-small';
  // The amount this contribution adds to the goal, in goal currency (null while unknown).
  const goalMinor =
    amount === null || amount <= 0
      ? null
      : !foreign
        ? amount
        : preview?.status === 'ok'
          ? preview.base.amountMinor
          : null;
  // Editing replaces the old amount rather than adding to it.
  const after =
    goalMinor === null ? null : afterThis(goal, goalMinor, initial?.goal_amount.amount_minor ?? 0);
  const money = (minor: number) =>
    formatMoney({
      amountMinor: minor,
      currency: goal.currency,
      exponent: goalMeta.exponent,
      symbol: goalMeta.symbol,
    });
  const canSave = amount !== null && amount > 0 && !tooSmall && online && !saving;

  function fail(error: unknown) {
    if (error instanceof ApiError && error.code === 'GOAL_ARCHIVED') {
      setProblem('This goal is read-only since you ended the connection.');
    } else if (error instanceof ApiError && error.code === 'FX_UNAVAILABLE') {
      setProblem(`We can't convert right now. You can still save in ${goal.currency}.`);
    } else if (error instanceof TypeError) {
      setProblem('Connect to the internet to do this.');
    } else {
      setProblem("We couldn't save that. Your entry is kept; try again.");
    }
  }

  function save() {
    if (!canSave) return;
    setProblem(null);
    const trimmed = note.trim();
    const wasCompleted = goal.status === 'completed';
    const done = (result: { goal: GoalDetail }, contributionId: string) => {
      const completedNow = !wasCompleted && result.goal.status === 'completed';
      if (completedNow) celebrate(goal.id, contributionId);
      onSaved({ goal: result.goal, completedNow });
    };
    if (!initial) {
      create.mutate(
        {
          id: clientId,
          amount_minor: amount,
          currency,
          contribution_date: date,
          ...(trimmed ? { note: trimmed } : {}),
        },
        {
          onSuccess: (result) => {
            done(result, result.saved.id);
          },
          onError: fail,
        },
      );
      return;
    }
    const body = {
      ...(amount !== initial.amount.amount_minor ? { amount_minor: amount } : {}),
      ...(currency !== initial.amount.currency ? { currency } : {}),
      ...(date !== initial.contribution_date ? { contribution_date: date } : {}),
      ...(trimmed !== (initial.note ?? '') ? { note: trimmed } : {}),
    };
    if (Object.keys(body).length === 0) {
      onSaved({ goal, completedNow: false });
      return;
    }
    patch.mutate(
      { cid: initial.id, body },
      {
        onSuccess: (result) => {
          done(result, result.saved.id);
        },
        onError: fail,
      },
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        save();
      }}
    >
      <p className="num type-body-sm text-fg-body">
        <span className="type-label text-fg-default">{goal.name}</span> ·{' '}
        {money(goal.balance.amount_minor)} of {money(goal.target.amount_minor)}
      </p>
      <AmountInput
        label="Amount"
        autoFocus
        value={amount}
        onValueChange={() => undefined}
        text={text}
        onTextChange={setText}
        currency={from}
        {...(preview ? { preview } : {})}
        {...(tooSmall ? { error: tooSmallMessage(goal.currency) } : {})}
        currencySlot={
          <CurrencyPicker
            value={currency}
            onValueChange={setCurrency}
            currencies={currencies}
            baseCurrency={base}
            recent={[goal.currency]}
          />
        }
        {...(foreign ? { hint: `Converted into the goal's currency, ${goal.currency}.` } : {})}
      />
      <DatePicker label="Date" value={date} onValueChange={setDate} today={today} />
      <Field
        id={noteId}
        label="Note (optional)"
        hint={`${String(note.length)} of ${String(NOTE_MAX)} characters`}
      >
        {({ id, describedBy }) => (
          <textarea
            id={id}
            rows={2}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
            aria-describedby={describedBy}
            className={cn(controlClass, 'min-h-(--touch-min) py-2')}
          />
        )}
      </Field>

      <section
        aria-label="After this contribution"
        aria-live="polite"
        className="flex flex-col gap-2 rounded-md bg-bg-subtle p-3"
      >
        {after ? (
          <>
            <p className="num type-label text-fg-default">
              After this: {money(after.balance)} saved · {progressLabel(after.pct, after.completes)}
              {after.completes && ' · Goal reached'}
            </p>
            <ProgressBar
              value={after.pct}
              label="Progress after this contribution"
              valueText={`${progressLabel(after.pct, after.completes)} after this contribution`}
              tone="saving"
            />
          </>
        ) : (
          <p className="type-body-sm text-fg-muted">
            Enter an amount to see your progress after it.
          </p>
        )}
      </section>

      {!online && <FormNotice tone="offline">Connect to the internet to do this.</FormNotice>}
      {problem && online && <FormNotice tone="error">{problem}</FormNotice>}
      <Button type="submit" size="lg" block loading={saving} disabled={!canSave}>
        {problem ? 'Retry' : initial ? 'Save changes' : 'Add contribution'}
      </Button>
    </form>
  );
}
