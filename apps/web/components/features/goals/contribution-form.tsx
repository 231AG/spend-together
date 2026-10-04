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
import { formatMoney, type MoneyDisplay } from '@/lib/format-money';
import { isNetworkFailure, queueEntry, updateQueued } from '@/lib/offline-entry';
import type { OutboxDisplay, OutboxItem } from '@/lib/outbox-machine';
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
  /** Edit a contribution still waiting to sync (§19.3 point 3). */
  queued?: OutboxItem;
  /** `queued`: kept on this device to sync later (F12-05). */
  onSaved: (result: { goal: GoalDetail; completedNow: boolean; queued?: boolean }) => void;
}

interface QueuedContributionBody {
  amount_minor: number;
  currency: string;
  contribution_date: string;
  note?: string;
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
      ownerId={me.data.id}
      today={today}
      currencies={currencies.data.data.filter((c) => c.is_active)}
    />
  );
}

function LoadedContributionForm({
  goal,
  initial,
  queued,
  onSaved,
  base,
  ownerId,
  today,
  currencies,
}: ContributionFormProps & {
  base: string;
  ownerId: string;
  today: string;
  currencies: { code: string; name: string; exponent: number; symbol: string }[];
}) {
  const online = useOnline();
  const noteId = useId();
  const meta = (code: string) =>
    currencies.find((c) => c.code === code) ?? { code, name: code, exponent: 2, symbol: code };

  const kept = queued?.body as QueuedContributionBody | undefined;
  const [currency, setCurrency] = useState(
    initial?.amount.currency ?? kept?.currency ?? goal.currency,
  );
  const [text, setText] = useState(() =>
    initial
      ? entryFromMinor(initial.amount.amount_minor, meta(initial.amount.currency).exponent)
      : kept
        ? entryFromMinor(kept.amount_minor, meta(kept.currency).exponent)
        : '',
  );
  const [date, setDate] = useState(initial?.contribution_date ?? kept?.contribution_date ?? today);
  const [note, setNote] = useState(initial?.note ?? kept?.note ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [clientId] = useState(() => queued?.id ?? crypto.randomUUID());

  const create = useCreateContribution(goal.id);
  const patch = usePatchContribution(goal.id);
  const saving = create.isPending || patch.isPending || queueing;
  // §19.1: a new contribution can be saved offline (queued); a synced one can't change.
  const canWork = initial ? online : true;

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
  const canSave = amount !== null && amount > 0 && !tooSmall && canWork && !saving;

  /** The "Sync pending" row, with estimates in goal and base currency (§11.2). */
  function display(minor: number): OutboxDisplay {
    const shown = (amountMinor: number, code: string): MoneyDisplay => ({
      amountMinor,
      currency: code,
      exponent: meta(code).exponent,
      symbol: meta(code).symbol,
    });
    const goalShare = goalMinor === null ? null : shown(goalMinor, goal.currency);
    const baseMinor =
      currency === base ? minor : goal.currency === base && goalMinor !== null ? goalMinor : null;
    const trimmed = note.trim();
    return {
      kind: 'contribution',
      goalId: goal.id,
      title: goal.name,
      amount: shown(minor, currency),
      goalEstimate: goalShare,
      baseEstimate: baseMinor === null ? null : shown(baseMinor, base),
      date,
      ...(trimmed ? { note: trimmed } : {}),
    };
  }

  /** Keep it on this device to sync later; the goal recomputes locally meanwhile. */
  function keep(body: Record<string, unknown> & { amount_minor: number }, sent = false) {
    setQueueing(true);
    const shown = display(body.amount_minor);
    const done = queued
      ? updateQueued(queued, body, shown)
      : queueEntry({
          id: clientId,
          endpoint: 'createContribution',
          params: { id: goal.id },
          body,
          ownerId,
          display: shown,
          sent,
        });
    void done.then(
      () => {
        setQueueing(false);
        onSaved({ goal, completedNow: false, queued: true });
      },
      () => {
        setQueueing(false);
        setProblem("We couldn't keep this on your device. Your entry is still here; try again.");
      },
    );
  }

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
    const done = (result: { goal: GoalDetail | null }, contributionId: string) => {
      // If the goal couldn't be reloaded the save still stands; only the celebration waits.
      const completedNow = !wasCompleted && result.goal?.status === 'completed';
      if (completedNow) celebrate(goal.id, contributionId);
      onSaved({ goal: result.goal ?? goal, completedNow });
    };
    if (!initial) {
      const body = {
        id: clientId,
        amount_minor: amount,
        currency,
        contribution_date: date,
        ...(trimmed ? { note: trimmed } : {}),
      };
      if (queued || !online) {
        keep(body);
        return;
      }
      create.mutate(body, {
        onSuccess: (result) => {
          done(result, result.saved.id);
        },
        // The connection dropped mid-save: keep it rather than ask for a retry (§19.3).
        onError: (error) => {
          if (isNetworkFailure(error)) keep(body, true);
          else fail(error);
        },
      });
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

      {!online &&
        (initial ? (
          <FormNotice tone="offline">Connect to the internet to do this.</FormNotice>
        ) : (
          <FormNotice tone="offline">
            You&apos;re offline. This contribution will be saved on this device and synced when you
            reconnect.
          </FormNotice>
        ))}
      {problem && <FormNotice tone="error">{problem}</FormNotice>}
      <Button type="submit" size="lg" block loading={saving} disabled={!canSave}>
        {problem ? 'Retry' : initial || queued ? 'Save changes' : 'Add contribution'}
      </Button>
    </form>
  );
}
