'use client';

import { ArrowDownLeft, ArrowUpRight, ChevronRight, PiggyBank, Plus } from 'lucide-react';
import Link from 'next/link';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/connectivity';
import { SAVED_OFFLINE } from '@/lib/offline-entry';
import { useActiveGoals, useGoal } from '@/lib/queries';
import { useToast } from '@/components/ui/toast';
import { ContributionForm } from './goals/contribution-form';
import { NotSavedOffline } from './offline/offline-states';
import { TransactionForm } from './transactions/transaction-form';

// SCR-09 Add sheet: Income, Expense, Savings contribution, each with its one-line
// explanation. Savings asks which goal first (§12.2), then opens the contribution form.
// Reachable from every main destination via the FAB, rail "+", sidebar Add and `N`.
// Online each choice is a route (shareable, Back closes it). Offline the forms open right
// here instead: a route change needs the server, and creating offline is the one thing
// that must keep working (§19.1, F12-05).

interface AddSheetContext {
  openAdd: () => void;
}

const Ctx = createContext<AddSheetContext | null>(null);

export function useAddSheet(): AddSheetContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAddSheet must be used inside <AddSheetProvider>');
  return ctx;
}

/** Marks the visible global Add control so focus can return to it after a route dialog. */
export const GLOBAL_ADD_ATTR = 'data-global-add';

export function focusGlobalAdd(): boolean {
  const candidates = document.querySelectorAll<HTMLElement>(`[${GLOBAL_ADD_ATTR}]`);
  for (const el of candidates) {
    // getClientRects, not offsetParent: the FAB is position:fixed, whose offsetParent is
    // always null even when visible. display:none gives no rects.
    if (el.getClientRects().length > 0) {
      el.focus();
      return true;
    }
  }
  return false;
}

export function AddSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openAdd = useCallback(() => {
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openAdd }), [openAdd]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <AddSheet open={open} onOpenChange={setOpen} />
    </Ctx.Provider>
  );
}

const ROW =
  'flex w-full min-h-(--touch-min) items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-bg-subtle';

function Row({
  icon,
  tile,
  title,
  body,
}: {
  icon: ReactNode;
  tile: string;
  title: string;
  body: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'inline-grid size-(--icon-tile-lg) shrink-0 place-items-center rounded-md',
          tile,
        )}
      >
        {icon}
      </span>
      <span className="flex flex-1 flex-col">
        <span className="type-label text-fg-default">{title}</span>
        <span className="type-body-sm text-fg-muted">{body}</span>
      </span>
      <ChevronRight aria-hidden className="size-(--icon-md) text-fg-muted" strokeWidth={1.75} />
    </>
  );
}

type Step =
  | { kind: 'choose' }
  | { kind: 'goal' }
  | { kind: 'transaction'; type: 'income' | 'expense' }
  | { kind: 'contribution'; goalId: string; name: string };

function GoalStep({
  onDone,
  onPick,
}: {
  onDone: () => void;
  onPick?: (goalId: string, name: string) => void;
}) {
  const goals = useActiveGoals(true);
  if (goals.isPending) return <LoadingSkeleton shape="row" count={3} label="Loading your goals" />;
  if (goals.isError) {
    return (
      <p className="type-body-lg text-fg-body">
        We couldn't load your goals. Close this and try again.
      </p>
    );
  }
  const list = goals.data.filter((g) => g.status !== 'completed');
  if (list.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="type-body-lg text-fg-body">
          Contributions go toward a goal. Create one first, then add money to it.
        </p>
        <Link href="/goals/new" onClick={onDone} className="type-label text-fg-link underline">
          Create a goal
        </Link>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-1" aria-label="Choose a goal">
      {list.map((g) => {
        const row = (
          <Row
            icon={<PiggyBank className="size-(--icon-md)" strokeWidth={1.75} />}
            tile="bg-secondary-50 text-saving"
            title={g.name}
            body={`${g.balance.formatted} of ${g.target.formatted}`}
          />
        );
        return (
          <li key={g.id}>
            {onPick ? (
              <button
                type="button"
                className={ROW}
                onClick={() => {
                  onPick(g.id, g.name);
                }}
              >
                {row}
              </button>
            ) : (
              <Link href={`/goals/${g.id}/contribute`} onClick={onDone} className={ROW}>
                {row}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Offline: the contribution form for a goal saved on this device. */
function OfflineContribution({
  goalId,
  onDone,
}: {
  goalId: string;
  onDone: (queued: boolean) => void;
}) {
  const goal = useGoal(goalId);
  if (goal.data) {
    return (
      <ContributionForm
        goal={goal.data}
        onSaved={(r) => {
          onDone(r.queued === true);
        }}
      />
    );
  }
  if (goal.isPending && goal.fetchStatus !== 'paused') {
    return <LoadingSkeleton shape="row" count={3} label="Loading the goal" />;
  }
  return <NotSavedOffline what="This goal" />;
}

function AddSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>({ kind: 'choose' });
  const online = useOnline();
  const toast = useToast();
  const close = () => {
    onOpenChange(false);
    setStep({ kind: 'choose' });
  };
  // Saved in place (offline, or the connection came back while the form was open).
  const saved = (queued: boolean, message: string) => {
    toast({ message: queued ? SAVED_OFFLINE : message });
    close();
  };
  const back = (
    <Button
      variant="ghost"
      size="sm"
      className="self-start"
      onClick={() => {
        setStep({ kind: 'choose' });
      }}
    >
      Back
    </Button>
  );
  const title =
    step.kind === 'choose'
      ? 'Add'
      : step.kind === 'goal'
        ? 'Add to which goal?'
        : step.kind === 'transaction'
          ? step.type === 'income'
            ? 'Add income'
            : 'Add expense'
          : `Add contribution to ${step.name}`;

  const choice = (type: 'income' | 'expense', row: ReactNode) =>
    online ? (
      <Link href={`/add/${type}`} onClick={close} className={ROW}>
        {row}
      </Link>
    ) : (
      <button
        type="button"
        className={ROW}
        onClick={() => {
          setStep({ kind: 'transaction', type });
        }}
      >
        {row}
      </button>
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setStep({ kind: 'choose' });
      }}
      title={title}
      presentation="responsive"
    >
      {step.kind === 'choose' && (
        <ul className="flex flex-col gap-1">
          <li>
            {choice(
              'income',
              <Row
                icon={<ArrowDownLeft className="size-(--icon-md)" strokeWidth={1.75} />}
                tile="bg-status-ontrack-bg text-income"
                title="Income"
                body="Money you received"
              />,
            )}
          </li>
          <li>
            {choice(
              'expense',
              <Row
                icon={<ArrowUpRight className="size-(--icon-md)" strokeWidth={1.75} />}
                tile="bg-status-behind-bg text-expense"
                title="Expense"
                body="Money you spent"
              />,
            )}
          </li>
          <li>
            <button
              type="button"
              className={ROW}
              onClick={() => {
                setStep({ kind: 'goal' });
              }}
            >
              <Row
                icon={<PiggyBank className="size-(--icon-md)" strokeWidth={1.75} />}
                tile="bg-secondary-50 text-saving"
                title="Savings contribution"
                body="Money you put toward a goal"
              />
            </button>
          </li>
        </ul>
      )}
      {step.kind === 'goal' && (
        <div className="flex flex-col gap-3">
          <GoalStep
            onDone={close}
            {...(online
              ? {}
              : {
                  onPick: (goalId: string, name: string) => {
                    setStep({ kind: 'contribution', goalId, name });
                  },
                })}
          />
          {back}
        </div>
      )}
      {step.kind === 'transaction' && (
        <div className="flex flex-col gap-3">
          {back}
          <TransactionForm
            type={step.type}
            onSaved={(_saved, outcome) => {
              saved(
                outcome === 'queued',
                step.type === 'income' ? 'Income added' : 'Expense added',
              );
            }}
          />
        </div>
      )}
      {step.kind === 'contribution' && (
        <div className="flex flex-col gap-3">
          {back}
          <OfflineContribution
            goalId={step.goalId}
            onDone={(queued) => {
              saved(queued, 'Contribution added');
            }}
          />
        </div>
      )}
    </Dialog>
  );
}

/** The global Add control in its three treatments (§12.2). */
export function AddButton({ variant }: { variant: 'fab' | 'rail' | 'sidebar' }) {
  const { openAdd } = useAddSheet();
  const props = { [GLOBAL_ADD_ATTR]: '', onClick: openAdd, type: 'button' as const };
  if (variant === 'sidebar') {
    return (
      <Button
        {...props}
        block
        iconLeft={<Plus aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />}
      >
        Add
      </Button>
    );
  }
  return (
    <button
      {...props}
      aria-label="Add transaction or contribution"
      className={cn(
        'inline-grid place-items-center bg-action-primary-bg text-action-primary-fg hover:bg-action-primary-bg-hover',
        variant === 'fab'
          ? 'fixed right-4 bottom-(--fab-bottom) z-(--z-fab) size-(--fab-size) rounded-full shadow-elev-3'
          : 'size-(--touch-min) rounded-md',
      )}
    >
      <Plus aria-hidden className="size-(--icon-lg)" strokeWidth={1.75} />
    </button>
  );
}
