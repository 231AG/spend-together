'use client';

import { ArrowDownLeft, ArrowUpRight, ChevronRight, PiggyBank, Plus } from 'lucide-react';
import Link from 'next/link';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/cn';
import { useActiveGoals } from '@/lib/queries';

// SCR-09 Add sheet: Income, Expense, Savings contribution, each with its one-line
// explanation. Savings asks which goal first (§12.2), then opens the contribution form.
// Reachable from every main destination via the FAB, rail "+", sidebar Add and `N`.

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
    if (el.offsetParent !== null) {
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

function GoalStep({ onDone }: { onDone: () => void }) {
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
      {list.map((g) => (
        <li key={g.id}>
          <Link href={`/goals/${g.id}/contribute`} onClick={onDone} className={ROW}>
            <Row
              icon={<PiggyBank className="size-(--icon-md)" strokeWidth={1.75} />}
              tile="bg-secondary-50 text-saving"
              title={g.name}
              body={`${g.balance.formatted} of ${g.target.formatted}`}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AddSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<'choose' | 'goal'>('choose');
  const close = () => {
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setStep('choose');
      }}
      title={step === 'choose' ? 'Add' : 'Add to which goal?'}
      presentation="responsive"
    >
      {step === 'choose' ? (
        <ul className="flex flex-col gap-1">
          <li>
            <Link href="/add/income" onClick={close} className={ROW}>
              <Row
                icon={<ArrowDownLeft className="size-(--icon-md)" strokeWidth={1.75} />}
                tile="bg-status-ontrack-bg text-income"
                title="Income"
                body="Money you received"
              />
            </Link>
          </li>
          <li>
            <Link href="/add/expense" onClick={close} className={ROW}>
              <Row
                icon={<ArrowUpRight className="size-(--icon-md)" strokeWidth={1.75} />}
                tile="bg-status-behind-bg text-expense"
                title="Expense"
                body="Money you spent"
              />
            </Link>
          </li>
          <li>
            <button
              type="button"
              className={ROW}
              onClick={() => {
                setStep('goal');
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
      ) : (
        <div className="flex flex-col gap-3">
          <GoalStep onDone={close} />
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setStep('choose');
            }}
          >
            Back
          </Button>
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
