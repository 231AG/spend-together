'use client';

import type { GoalDetail } from '@spendtogether/schemas';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type SyntheticEvent } from 'react';
import { AmountInput } from '@/components/ui/amount-input';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CurrencyPicker } from '@/components/ui/currency-picker';
import { Field, controlClass } from '@/components/ui/field';
import { FormNotice } from '@/components/ui/form-message';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';
import { entryFromMinor, readEntry } from '@/lib/amount-entry';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/connectivity';
import { GOAL_ICONS } from '@/lib/goals';
import { useCouple, useCurrencies, useMe, useToday } from '@/lib/queries';
import { useCreateGoal, useDeleteGoal, usePatchGoal } from './use-goal-mutations';

// SCR-16 create / edit goal (F9-03, F9-04; FR-12, FR-13, FR-18). Type (Individual by
// default; Couple disabled with the reason and a Connect partner link when there is no
// active couple), name, icon, target amount with currency, target date ≥ today (BR-10),
// with Create disabled until valid. Editing never shows a currency control (BR-15).

const NAME_MAX = 60;

export interface GoalFormProps {
  /** Edit mode. */
  initial?: GoalDetail;
  /** Create mode: `?type=couple` preselects Couple when allowed. */
  preferCouple?: boolean;
}

export function GoalForm(props: GoalFormProps) {
  const me = useMe();
  const today = useToday();
  const currencies = useCurrencies();
  const couple = useCouple();
  if (!me.data || !today || !currencies.data || couple.isPending) {
    return <LoadingSkeleton shape="row" count={4} label="Loading the form" />;
  }
  return (
    <LoadedGoalForm
      {...props}
      base={me.data.base_currency}
      today={today}
      currencies={currencies.data.data.filter((c) => c.is_active)}
      coupleActive={couple.data?.status === 'active'}
    />
  );
}

function LoadedGoalForm({
  initial,
  preferCouple,
  base,
  today,
  currencies,
  coupleActive,
}: GoalFormProps & {
  base: string;
  today: string;
  currencies: { code: string; name: string; exponent: number; symbol: string }[];
  coupleActive: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const ids = { type: useId(), icons: useId(), date: useId() };
  const meta = (code: string) =>
    currencies.find((c) => c.code === code) ?? { code, name: code, exponent: 2, symbol: code };

  const [type, setType] = useState<'individual' | 'couple'>(
    initial?.type ?? (preferCouple && coupleActive ? 'couple' : 'individual'),
  );
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'piggy-bank');
  const [currency, setCurrency] = useState(initial?.currency ?? base);
  const [text, setText] = useState(() =>
    initial ? entryFromMinor(initial.target.amount_minor, meta(initial.currency).exponent) : '',
  );
  const [date, setDate] = useState(initial?.target_date ?? '');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const create = useCreateGoal();
  const patch = usePatchGoal(initial?.id ?? '');
  const remove = useDeleteGoal();
  const saving = create.isPending || patch.isPending;

  const entry = readEntry(text, meta(currency).exponent);
  const amount = entry.kind === 'ok' ? entry.minor : null;
  const errors = {
    name: name.trim() === '' ? 'Give the goal a name.' : null,
    amount: amount === null || amount <= 0 ? 'Enter a target greater than 0.' : null,
    date:
      date === '' ? 'Choose a target date.' : date < today ? 'Choose today or a later date.' : null,
  };
  const valid = !errors.name && !errors.amount && !errors.date;
  const show = (field: keyof typeof errors) =>
    serverErrors[
      field === 'amount' ? 'target_amount_minor' : field === 'date' ? 'target_date' : field
    ] ?? (touched[field] ? errors[field] : null);

  function fail(error: unknown) {
    if (error instanceof ApiError && error.code === 'COUPLE_REQUIRED') {
      setProblem('Connect a partner to create shared goals.');
    } else if (error instanceof ApiError && error.code === 'GOAL_ARCHIVED') {
      setProblem('This goal is read-only since you ended the connection.');
    } else if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
      setServerErrors(error.fields);
    } else if (error instanceof TypeError) {
      setProblem('Connect to the internet to do this.');
    } else {
      setProblem("We couldn't save that. Try again.");
    }
  }

  function submit() {
    setTouched({ name: true, amount: true, date: true });
    if (!valid || amount === null) return;
    setProblem(null);
    setServerErrors({});
    if (!initial) {
      create.mutate(
        { type, name: name.trim(), icon, currency, target_amount_minor: amount, target_date: date },
        {
          onSuccess: (goal) => {
            toast({ message: 'Goal created' });
            router.replace(`/goals/${goal.id}`);
          },
          onError: fail,
        },
      );
      return;
    }
    const body = {
      ...(name.trim() !== initial.name ? { name: name.trim() } : {}),
      ...(icon !== initial.icon ? { icon } : {}),
      ...(amount !== initial.target.amount_minor ? { target_amount_minor: amount } : {}),
      ...(date !== initial.target_date ? { target_date: date } : {}),
    };
    if (Object.keys(body).length === 0) {
      router.replace(`/goals/${initial.id}`);
      return;
    }
    patch.mutate(body, {
      onSuccess: () => {
        toast({ message: 'Changes saved' });
        router.replace(`/goals/${initial.id}`);
      },
      onError: fail,
    });
  }

  const blur = (field: string) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event: SyntheticEvent) => {
        event.preventDefault();
        submit();
      }}
    >
      {!initial && (
        <fieldset className="flex flex-col gap-2">
          <legend className="type-label text-fg-default">Goal type</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['individual', 'Just me', 'Only you contribute and see it.'],
                ['couple', 'With my partner', 'You both contribute and see it.'],
              ] as const
            ).map(([value, label, hint]) => {
              const disabled = value === 'couple' && !coupleActive;
              return (
                <label
                  key={value}
                  className={cn(
                    'flex min-h-(--touch-min) cursor-pointer items-start gap-3 rounded-md border border-border-input bg-bg-card p-3',
                    'has-[:focus-visible]:focus-ring',
                    type === value && 'border-action-primary-bg bg-bg-selected',
                    disabled && 'cursor-not-allowed opacity-(--opacity-disabled)',
                  )}
                >
                  <input
                    type="radio"
                    name={ids.type}
                    value={value}
                    checked={type === value}
                    disabled={disabled}
                    aria-describedby={disabled ? `${ids.type}-why` : undefined}
                    onChange={() => {
                      setType(value);
                    }}
                    className="mt-1"
                  />
                  <span className="flex flex-col">
                    <span className="type-label text-fg-default">{label}</span>
                    <span className="type-body-sm text-fg-body">{hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {!coupleActive && (
            <p id={`${ids.type}-why`} className="type-body-sm text-fg-body">
              Connect a partner to create shared goals.{' '}
              <Link href="/couple" className="type-label text-fg-link underline">
                Connect partner
              </Link>
            </p>
          )}
        </fieldset>
      )}

      <Input
        label="Name"
        value={name}
        maxLength={NAME_MAX}
        onChange={(e) => {
          setName(e.target.value);
        }}
        onBlur={blur('name')}
        {...(show('name') ? { error: show('name') } : {})}
      />

      <fieldset className="flex flex-col gap-2">
        <legend id={ids.icons} className="type-label text-fg-default">
          Icon
        </legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GOAL_ICONS).map(([key, { Icon, label }]) => (
            <label
              key={key}
              title={label}
              className={cn(
                'inline-grid size-(--touch-min) cursor-pointer place-items-center rounded-md border border-border-input bg-bg-card text-fg-body',
                'has-[:focus-visible]:focus-ring',
                icon === key && 'border-action-primary-bg bg-bg-selected text-fg-link',
              )}
            >
              <input
                type="radio"
                name={`${ids.icons}-choice`}
                value={key}
                checked={icon === key}
                onChange={() => {
                  setIcon(key);
                }}
                aria-label={label}
                className="sr-only"
              />
              <Icon aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
            </label>
          ))}
        </div>
      </fieldset>

      <div onBlur={blur('amount')}>
        <AmountInput
          label="Target amount"
          value={amount}
          onValueChange={() => undefined}
          text={text}
          onTextChange={setText}
          currency={meta(currency)}
          {...(show('amount') ? { error: show('amount') } : {})}
          currencySlot={
            initial ? undefined : (
              <CurrencyPicker
                label="Goal currency"
                value={currency}
                onValueChange={setCurrency}
                currencies={currencies}
                baseCurrency={base}
              />
            )
          }
          {...(initial ? { hint: "A goal's currency can't change after it's created." } : {})}
        />
      </div>

      <Field id={ids.date} label="Target date" {...(show('date') ? { error: show('date') } : {})}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            type="date"
            min={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
            }}
            onBlur={blur('date')}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={controlClass}
          />
        )}
      </Field>

      {!online && <FormNotice tone="offline">Connect to the internet to do this.</FormNotice>}
      {problem && online && <FormNotice tone="error">{problem}</FormNotice>}

      <Button type="submit" size="lg" block loading={saving} disabled={!valid || !online || saving}>
        {initial ? 'Save changes' : 'Create goal'}
      </Button>
      {!valid && !saving && (
        <p className="type-body-sm text-fg-muted">{errors.name ?? errors.amount ?? errors.date}</p>
      )}

      {initial && (
        <ConfirmationDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this goal?"
          consequences={`"${initial.name}" and all of its contributions will be deleted. This can't be undone.`}
          confirmLabel="Delete goal"
          destructive
          onConfirm={() => {
            remove.mutate(initial.id, {
              onSuccess: () => {
                toast({ message: 'Goal deleted' });
                router.replace('/goals');
              },
              onError: fail,
            });
          }}
          trigger={
            <Button variant="tertiary" loading={remove.isPending} className="self-start">
              Delete goal
            </Button>
          }
        />
      )}
    </form>
  );
}
