'use client';

import type { Contribution, GoalDetail } from '@spendtogether/schemas';
import { Archive, CalendarClock, Clock, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FormNotice } from '@/components/ui/form-message';
import { IconButton } from '@/components/ui/icon-button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ProgressBar } from '@/components/ui/progress-bar';
import { GoalIcon } from '@/components/ui/goal-icon';
import { StatusChip } from '@/components/ui/status-chip';
import { formatMoney, type MoneyDisplay } from '@/lib/format-money';
import {
  contributionDate,
  heroLine,
  progressLabel,
  projectionText,
  shortDate,
  statusSentence,
} from '@/lib/goals';
import { money as toMoney } from '@/lib/insights';
import { useContributions, useCurrencies, useMe, useToday } from '@/lib/queries';
import { CompletionCelebration } from './completion-celebration';
import { ARCHIVED_COPY, GoalGate } from './goal-gate';
import { ContributionForm } from './contribution-form';
import { useDeleteContribution } from './use-goal-mutations';

// SCR-17 goal details (F9-05…F9-08, F9-10, F9-12, F9-13): the hero, required pace, a
// plain-language status card, the projection, who contributed what (couple goals) and
// the history. Add contribution stays in reach (sticky on phones); an archived couple goal
// is read-only with its history intact (BR-18).

const addLink =
  'inline-flex min-h-(--touch-min) items-center justify-center rounded-md bg-action-primary-bg px-5 type-label text-action-primary-fg hover:bg-action-primary-bg-hover';

export function GoalDetails({ id }: { id: string }) {
  return <GoalGate id={id}>{(goal) => <Loaded goal={goal} />}</GoalGate>;
}

function Loaded({ goal }: { goal: GoalDetail }) {
  const today = useToday();
  const me = useMe();
  const { byCode } = useCurrencies();
  const contributions = useContributions(goal.id);
  const money = (amountMinor: number, currency = goal.currency): MoneyDisplay =>
    toMoney(amountMinor, currency, byCode.get(currency));
  const fmt = (minor: number) => formatMoney(money(minor));
  const archived = goal.archived_at !== null;
  const completed = goal.status === 'completed';
  const pct = progressLabel(goal.progress_pct, completed);
  const saved = fmt(goal.balance.amount_minor);
  const target = fmt(goal.target.amount_minor);

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-0">
      <CompletionCelebration goalId={goal.id} goalName={goal.name} />
      {archived && (
        <div role="note" className="flex items-start gap-3 rounded-lg bg-bg-subtle p-4">
          <Archive
            aria-hidden
            className="mt-0.5 size-(--icon-md) shrink-0 text-fg-muted"
            strokeWidth={1.75}
          />
          <p className="type-body-lg text-fg-body">
            {ARCHIVED_COPY} Its history stays here for both of you.
          </p>
        </div>
      )}

      <section
        aria-labelledby="goal-hero"
        className="flex flex-col gap-4 rounded-xl bg-bg-card p-5 shadow-elev-1 md:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <GoalIcon icon={goal.icon} />
            <div className="flex flex-col">
              <h2 id="goal-hero" className="type-h3 text-fg-default">
                {goal.name}
              </h2>
              <span className="type-caption text-fg-muted">
                {goal.type === 'couple' ? 'Shared goal' : 'Your goal'} · by{' '}
                {shortDate(goal.target_date, today)} · {goal.currency}
              </span>
            </div>
          </div>
          <StatusChip status={goal.status} overdue={goal.required_pace.overdue} />
        </div>
        <p className="num">
          <span className="type-num-display text-fg-default">{saved}</span>{' '}
          <span className="type-body-lg text-fg-body">of {target}</span>
        </p>
        <ProgressBar
          value={goal.progress_pct}
          label={`${goal.name} progress`}
          valueText={`${pct} saved, ${saved} of ${target}`}
          tone="saving"
        />
        <p className="num type-body-sm text-fg-body">
          {heroLine(goal, (m, c) => money(m, c), goal.required_pace.overdue)}
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <PaceCard goal={goal} fmt={fmt} />
        <section
          aria-labelledby="goal-status"
          className="flex flex-col gap-2 rounded-xl bg-bg-card p-5 shadow-elev-1"
        >
          <h2 id="goal-status" className="type-label text-fg-muted">
            Status
          </h2>
          <p className="type-body-lg text-fg-default">
            {statusSentence(goal, (m, c) => money(m, c), today)}
          </p>
          <p className="flex items-center gap-2 type-body-sm text-fg-body">
            <CalendarClock aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
            {projectionText(goal, today)}
          </p>
        </section>
      </div>

      {goal.contributors && goal.contributors.length > 0 && (
        <ContributorBreakdown goal={goal} myId={me.data?.id ?? null} fmt={fmt} />
      )}

      <ContributionHistory
        goal={goal}
        contributions={contributions}
        money={money}
        readOnly={archived}
      />

      {!archived && (
        // Sticky above the tab bar on phones (SCR-17); inline from 768 px.
        <div className="fixed inset-x-0 bottom-(--tabbar-total) z-(--z-sticky) border-t border-border-default bg-bg-card p-3 pr-(--fab-clearance) md:static md:border-0 md:bg-transparent md:p-0">
          <div className="flex gap-3">
            <Link
              href={`/goals/${goal.id}/contribute`}
              className={`${addLink} flex-1 md:flex-none`}
            >
              Add contribution
            </Link>
            <Link
              href={`/goals/${goal.id}/edit`}
              className="inline-flex min-h-(--touch-min) items-center gap-2 rounded-md border border-border-input bg-bg-card px-4 type-label text-fg-default hover:bg-bg-subtle"
            >
              <Pencil aria-hidden className="size-(--icon-sm)" strokeWidth={1.75} />
              Edit goal
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PaceCard({ goal, fmt }: { goal: GoalDetail; fmt: (minor: number) => string }) {
  const pace = goal.required_pace;
  const completed = goal.status === 'completed';
  return (
    <section
      aria-labelledby="goal-pace"
      className="flex flex-col gap-2 rounded-xl bg-bg-card p-5 shadow-elev-1"
    >
      <h2 id="goal-pace" className="type-label text-fg-muted">
        Required pace
      </h2>
      {completed ? (
        <p className="type-body-lg text-fg-default">Nothing more needed.</p>
      ) : pace.overdue ? (
        <p className="flex items-center gap-2 type-body-lg text-fg-default">
          <Clock aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
          Overdue
        </p>
      ) : (
        <dl className="grid grid-cols-3 gap-2">
          {(
            [
              ['Per day', pace.daily],
              ['Per week', pace.weekly],
              ['Per month', pace.monthly],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="type-caption text-fg-muted">{label}</dt>
              <dd className="num type-label text-fg-default">{fmt(value ?? 0)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** C-07: one stacked bar plus "You $480.00 (60%) · Sam $320.00 (40%)" (F-21). */
function ContributorBreakdown({
  goal,
  myId,
  fmt,
}: {
  goal: GoalDetail;
  myId: string | null;
  fmt: (minor: number) => string;
}) {
  const people = (goal.contributors ?? []).map((c, i) => ({
    ...c,
    label: c.user_id === myId ? 'You' : c.name,
    paint: i === 0 ? 'var(--color-secondary-500)' : 'var(--color-accent-500)',
  }));
  const sentence = people
    .map((p) => `${p.label} ${fmt(p.amount.amount_minor)} (${progressLabel(p.share_pct, true)})`)
    .join(' · ');
  return (
    <section
      aria-labelledby="goal-contributors"
      className="flex flex-col gap-3 rounded-xl bg-bg-card p-5 shadow-elev-1"
    >
      <h2 id="goal-contributors" className="type-label text-fg-muted">
        Who contributed
      </h2>
      <div
        aria-hidden
        className="flex h-(--progress-h) w-full gap-0.5 overflow-hidden rounded-full bg-progress-track"
      >
        {people.map((p) => (
          <span
            key={p.user_id}
            className="block h-full"
            style={{ width: `${String(p.share_pct)}%`, background: p.paint }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-fg-body">
        {people.map((p) => (
          <li key={p.user_id} className="inline-flex items-center gap-2 num">
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-full"
              style={{ background: p.paint }}
            />
            {p.label} {fmt(p.amount.amount_minor)} ({progressLabel(p.share_pct, true)})
          </li>
        ))}
      </ul>
      <p className="sr-only">{sentence}</p>
    </section>
  );
}

function ContributionHistory({
  goal,
  contributions,
  money,
  readOnly,
}: {
  goal: GoalDetail;
  contributions: ReturnType<typeof useContributions>;
  money: (amountMinor: number, currency?: string) => MoneyDisplay;
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [deleting, setDeleting] = useState<Contribution | null>(null);
  const remove = useDeleteContribution(goal.id);
  const couple = goal.type === 'couple';

  let body;
  if (contributions.isPending)
    body = <LoadingSkeleton shape="row" count={3} label="Loading contributions" />;
  else if (contributions.isError)
    body = (
      <ErrorState
        variant="banner"
        message="We couldn't load the contribution history."
        onRetry={() => void contributions.refetch()}
      />
    );
  else if (contributions.data.pages.every((p) => p.data.length === 0))
    body = (
      <EmptyState
        title="No contributions yet"
        body="Add your first contribution to start tracking progress."
      />
    );
  else
    body = (
      <ul className="flex flex-col divide-y divide-border-default">
        {contributions.data.pages
          .flatMap((p) => p.data)
          .map((c) => {
            const inGoal = formatMoney(money(c.goal_amount.amount_minor));
            const foreign = c.amount.currency !== goal.currency;
            const original = formatMoney(money(c.amount.amount_minor, c.amount.currency), {
              baseCurrency: goal.currency,
            });
            return (
              <li key={c.id} className="flex items-start gap-3 py-3">
                <div className="flex flex-1 flex-col">
                  <span className="num type-label text-fg-default">
                    {inGoal}
                    {foreign && <span className="type-body-sm text-fg-muted"> · {original}</span>}
                  </span>
                  <span className="type-body-sm text-fg-muted">
                    {[
                      contributionDate(c.contribution_date),
                      couple ? (c.is_own ? 'You' : c.contributor.name) : null,
                      c.note,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {c.is_own && !readOnly && (
                  <div className="flex gap-1">
                    <IconButton
                      label={`Edit contribution of ${inGoal} on ${contributionDate(c.contribution_date)}`}
                      icon={<Pencil />}
                      onClick={() => {
                        setEditing(c);
                      }}
                    />
                    <IconButton
                      label={`Delete contribution of ${inGoal} on ${contributionDate(c.contribution_date)}`}
                      icon={<Trash2 />}
                      onClick={() => {
                        setDeleting(c);
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
      </ul>
    );

  return (
    <section
      aria-labelledby="goal-history"
      className="flex flex-col gap-3 rounded-xl bg-bg-card p-5 shadow-elev-1"
    >
      <h2 id="goal-history" className="type-h3 text-fg-default">
        Contributions
      </h2>
      {remove.isError && (
        <FormNotice tone="error">
          We couldn't delete that. Nothing was changed; try again.
        </FormNotice>
      )}
      {body}
      {contributions.hasNextPage && (
        <Button
          variant="secondary"
          className="self-start"
          loading={contributions.isFetchingNextPage}
          onClick={() => void contributions.fetchNextPage()}
        >
          Load more
        </Button>
      )}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Edit contribution"
      >
        {editing && (
          <ContributionForm
            goal={goal}
            initial={editing}
            onSaved={() => {
              setEditing(null);
            }}
          />
        )}
      </Dialog>
      <ConfirmationDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this contribution?"
        consequences="The goal's balance, progress and status will be recalculated. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </section>
  );
}
