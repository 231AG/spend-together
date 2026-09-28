'use client';

import { endpoints, type ActivityItem, type Transaction } from '@spendtogether/schemas';
import { useQuery } from '@tanstack/react-query';
import { useId, useMemo, useState, type SyntheticEvent } from 'react';
import { AmountInput } from '@/components/ui/amount-input';
import { Button } from '@/components/ui/button';
import { CategoryPicker } from '@/components/ui/category-picker';
import { CurrencyPicker } from '@/components/ui/currency-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, controlClass } from '@/components/ui/field';
import { FormNotice } from '@/components/ui/form-message';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { entryFromMinor, readEntry } from '@/lib/amount-entry';
import { ApiError, apiClient } from '@/lib/api-client';
import { appClock } from '@/lib/clock';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/connectivity';
import { previewConversion, tooSmallMessage } from '@/lib/conversion-preview';
import { formatMoney } from '@/lib/format-money';
import { queryKeys, useCategories, useCurrencies, useMe, useRates, useToday } from '@/lib/queries';
import { crossRateFor, recentDistinct } from '@/lib/transactions';
import { useCreateTransaction, usePatchTransaction } from './use-transaction-mutations';

// SCR-10 / SCR-11 (FR-06, FR-07, FR-24) and the edit form (FR-08). One component for
// income and expense so the layout and control order are identical (muscle memory).
// Amount first and focused; currency defaults to base; category with the last five used
// first; date defaults to today; optional note. The ≈ base line uses the rates for the
// chosen date (BR-14), through the same domain `convert` the server uses (WAC-14).

export type TransactionType = 'income' | 'expense';
const NOTE_MAX = 280;

export interface TransactionFormProps {
  type: TransactionType;
  /** Edit mode: the record being changed. */
  initial?: Transaction;
  onSaved: (saved: Transaction, change: 'created' | 'updated') => void;
}

function useRecent(type: TransactionType) {
  return useQuery({
    queryKey: queryKeys.recentTransactions(type),
    queryFn: () => apiClient.call(endpoints.listTransactions, { query: { type, limit: 50 } }),
    staleTime: 60_000,
    select: (res) => ({
      categories: recentDistinct(res.data, (t) => t.category.id),
      currencies: recentDistinct(res.data, (t) => t.amount.currency),
    }),
  });
}

export function TransactionForm(props: TransactionFormProps) {
  const me = useMe();
  const today = useToday();
  const currencies = useCurrencies();
  const categories = useCategories(props.type);
  if (!me.data || !today || !currencies.data || !categories.data) {
    return <LoadingSkeleton shape="row" count={4} label="Loading the form" />;
  }
  return (
    <LoadedForm
      {...props}
      base={me.data.base_currency}
      today={today}
      currencies={currencies.data.data.filter((c) => c.is_active)}
      categories={categories.data}
    />
  );
}

type Loaded = TransactionFormProps & {
  base: string;
  today: string;
  currencies: { code: string; name: string; exponent: number; symbol: string }[];
  categories: { id: string; name: string; icon: string; color: string; type: TransactionType }[];
};

function LoadedForm({ type, initial, onSaved, base, today, currencies, categories }: Loaded) {
  const online = useOnline();
  const noteId = useId();
  const recent = useRecent(type);
  const byCode = useMemo(() => new Map(currencies.map((c) => [c.code, c] as const)), [currencies]);
  const meta = (code: string) => byCode.get(code) ?? { code, exponent: 2, symbol: code };

  const [currency, setCurrency] = useState(initial?.amount.currency ?? base);
  const [text, setText] = useState(() =>
    initial
      ? entryFromMinor(initial.amount.amount_minor, meta(initial.amount.currency).exponent)
      : '',
  );
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category.id ?? null);
  const [date, setDate] = useState(initial?.transaction_date ?? today);
  const [note, setNote] = useState(initial?.note ?? '');
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  // One identity per entry: retries of this form reuse it (idempotent create).
  const [clientId] = useState(() => crypto.randomUUID());

  const create = useCreateTransaction();
  const patch = usePatchTransaction(initial?.id ?? '');
  const saving = create.isPending || patch.isPending;

  const from = meta(currency);
  const baseMeta = meta(base);
  const entry = readEntry(text, from.exponent);
  const amountMinor = entry.kind === 'ok' ? entry.minor : null;
  const foreign = currency !== base;
  const rates = useRates(date, foreign);
  const preview =
    foreign && amountMinor !== null && amountMinor > 0
      ? previewConversion({
          amountMinor,
          from,
          base: baseMeta,
          rate: rates.isPending ? null : crossRateFor(rates.data?.rates, currency, base),
          estimated: rates.data?.estimated ?? false,
        })
      : undefined;
  const tooSmall = preview?.status === 'too-small';
  const canSave =
    amountMinor !== null &&
    amountMinor > 0 &&
    categoryId !== null &&
    !tooSmall &&
    online &&
    !saving;

  function optimisticItem(): ActivityItem | null {
    if (amountMinor === null || categoryId === null) return null;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return null;
    const baseMinor = !foreign
      ? amountMinor
      : preview?.status === 'ok'
        ? preview.base.amountMinor
        : null;
    if (baseMinor === null) return null;
    const now = appClock.now().toISOString();
    const money = (minor: number, code: string) => ({
      amount_minor: minor,
      currency: code,
      formatted: formatMoney(
        {
          amountMinor: minor,
          currency: code,
          exponent: meta(code).exponent,
          symbol: meta(code).symbol,
        },
        { baseCurrency: base },
      ),
    });
    return {
      kind: 'transaction',
      id: clientId,
      type,
      date,
      amount: money(amountMinor, currency),
      base_amount: money(baseMinor, base),
      fx: { rate: '1', rate_date: date, estimated: rates.data?.estimated ?? false },
      category: { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color },
      transaction_date: date,
      note: note.trim() === '' ? null : note.trim(),
      created_at: now,
      updated_at: now,
    };
  }

  function fail(error: unknown) {
    if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
      setServerErrors(error.fields);
      setProblem('Check the highlighted fields.');
    } else if (error instanceof TypeError) {
      setProblem("You're offline. Your entry is kept; try again when connected.");
    } else if (error instanceof ApiError && error.code === 'FX_UNAVAILABLE') {
      setProblem('Exchange rates are unavailable right now. Your entry is kept; try again soon.');
    } else {
      setProblem("We couldn't save this. Your entry is kept; try again.");
    }
  }

  function save() {
    if (!canSave) return;
    setProblem(null);
    setServerErrors({});
    const trimmed = note.trim();
    if (!initial) {
      create.mutate(
        {
          body: {
            id: clientId,
            type,
            amount_minor: amountMinor,
            currency,
            category_id: categoryId,
            transaction_date: date,
            ...(trimmed ? { note: trimmed } : {}),
          },
          optimistic: optimisticItem(),
        },
        {
          onSuccess: (saved) => {
            onSaved(saved, 'created');
          },
          onError: fail,
        },
      );
      return;
    }
    const body = {
      ...(amountMinor !== initial.amount.amount_minor ? { amount_minor: amountMinor } : {}),
      ...(currency !== initial.amount.currency ? { currency } : {}),
      ...(categoryId !== initial.category.id ? { category_id: categoryId } : {}),
      ...(date !== initial.transaction_date ? { transaction_date: date } : {}),
      ...(trimmed !== (initial.note ?? '') ? { note: trimmed } : {}),
    };
    if (Object.keys(body).length === 0) {
      onSaved(initial, 'updated');
      return;
    }
    patch.mutate(body, {
      onSuccess: (saved) => {
        onSaved(saved, 'updated');
      },
      onError: fail,
    });
  }

  const amountError =
    serverErrors['amount_minor'] ?? (tooSmall ? tooSmallMessage(base) : undefined);
  const noun = type === 'income' ? 'income' : 'expense';

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        save();
      }}
    >
      <AmountInput
        label="Amount"
        autoFocus
        value={amountMinor}
        onValueChange={() => undefined}
        text={text}
        onTextChange={setText}
        currency={from}
        {...(preview ? { preview } : {})}
        {...(amountError ? { error: amountError } : {})}
        currencySlot={
          <CurrencyPicker
            value={currency}
            onValueChange={setCurrency}
            currencies={currencies}
            baseCurrency={base}
            recent={recent.data?.currencies ?? []}
          />
        }
      />
      <div className="flex flex-col gap-1.5">
        <CategoryPicker
          type={type}
          value={categoryId}
          onValueChange={setCategoryId}
          categories={categories}
          recent={recent.data?.categories ?? []}
        />
        {serverErrors['category_id'] && (
          <p className="type-body-sm text-fg-error">{serverErrors['category_id']}</p>
        )}
      </div>
      <DatePicker
        label="Date"
        value={date}
        onValueChange={setDate}
        today={today}
        {...(serverErrors['transaction_date'] ? { error: serverErrors['transaction_date'] } : {})}
      />
      <Field
        id={noteId}
        label="Note (optional)"
        hint={`${String(note.length)} of ${String(NOTE_MAX)} characters`}
        {...(serverErrors['note'] ? { error: serverErrors['note'] } : {})}
      >
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            rows={2}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, 'min-h-(--touch-min) py-2')}
          />
        )}
      </Field>

      {!online && (
        <FormNotice tone="offline">You're offline. Connect to save this {noun}.</FormNotice>
      )}
      {problem && online && <FormNotice tone="error">{problem}</FormNotice>}

      <Button type="submit" size="lg" block loading={saving} disabled={!canSave}>
        {problem ? 'Retry' : initial ? 'Save changes' : `Save ${noun}`}
      </Button>
      {online && !saving && (amountMinor === null || amountMinor <= 0 || categoryId === null) && (
        // Why Save is disabled, in words (never only a greyed button).
        <p className="type-body-sm text-fg-muted">
          {amountMinor === null || amountMinor <= 0
            ? 'Enter an amount to save.'
            : 'Choose a category to save.'}
        </p>
      )}
    </form>
  );
}
