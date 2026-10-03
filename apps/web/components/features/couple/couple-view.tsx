'use client';

import type { CoupleState, Invitation } from '@spendtogether/schemas';
import { Clock, HeartHandshake, Lock, Mail, Phone, UserX, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { FormNotice } from '@/components/ui/form-message';
import { GoalCard } from '@/components/ui/goal-card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';
import { useOnline } from '@/lib/connectivity';
import { COUPLE_PRIVACY, OFFLINE_BLOCKED, firstName } from '@/lib/couple';
import { formatDay } from '@/lib/format-date';
import { goalCardData } from '@/lib/insights';
import { useCouple, useCurrencies, useGoals, useToday } from '@/lib/queries';
import { EndConnectionDialog } from './end-connection-dialog';
import { InviteForm } from './invite-form';
import { useCancelInvitation, useResendInvitation } from './use-couple-actions';

// SCR-19 Couple (F10-01…F10-04, F10-08, F10-09). One status card per state. Whatever the
// state, the only things ever rendered about a partner are their name and the dates of
// the connection, plus shared goals (BR-05): the contract has no field for anything else.

const card = 'flex flex-col gap-4 rounded-xl bg-bg-card p-5 shadow-elev-1 md:p-6';
const primaryLink =
  'inline-flex min-h-(--touch-min) items-center justify-center rounded-md bg-action-primary-bg px-4 type-label text-action-primary-fg hover:bg-action-primary-bg-hover';

function PrivacyNote() {
  return (
    <p className="flex items-start gap-2 rounded-md bg-bg-subtle p-3 type-body-sm text-fg-body">
      <Lock aria-hidden className="mt-0.5 size-(--icon-sm) shrink-0" strokeWidth={1.75} />
      {COUPLE_PRIVACY}
    </p>
  );
}

const day = (iso: string) => formatDay(iso.slice(0, 10), 'en-GB', true);

export function CoupleView() {
  const couple = useCouple();
  const online = useOnline();
  if (couple.isPending) return <LoadingSkeleton shape="card" label="Loading your connection" />;
  if (couple.isError) {
    return (
      <ErrorState
        message="We couldn't load your connection."
        onRetry={() => void couple.refetch()}
        retrying={couple.isFetching}
      />
    );
  }
  const state = couple.data;
  return (
    <div className="mx-auto flex w-full max-w-(--dialog-max) flex-col gap-6">
      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
      {state.status === 'active' && state.partner ? (
        <Connected state={state} partnerName={state.partner.name} since={state.partner.since} />
      ) : state.status === 'pending' && state.invitation ? (
        <Pending invitation={state.invitation} />
      ) : (
        <NoPartner state={state} />
      )}
    </div>
  );
}

function NoPartner({ state }: { state: CoupleState }) {
  const last = state.invitation;
  return (
    <>
      {state.status === 'ended' && state.partner && (
        <section aria-labelledby="ended-title" className={card}>
          <h2 id="ended-title" className="flex items-center gap-2 type-h3 text-fg-default">
            <UserX aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
            Connection ended
          </h2>
          <p className="type-body-lg text-fg-body">
            You and {firstName(state.partner.name)} ended your connection
            {state.ended_at ? ` on ${day(state.ended_at)}` : ''}. Your shared goals are read-only
            for both of you, and their history stays.
          </p>
          <Link href="/goals?tab=ours" className="self-start type-label text-fg-link underline">
            See shared goals
          </Link>
        </section>
      )}
      {last && <ClosedInvitation invitation={last} />}
      <section aria-labelledby="invite-title" className={card}>
        <span
          aria-hidden
          className="inline-grid size-(--icon-tile-lg) place-items-center rounded-full bg-secondary-50 text-saving"
        >
          <HeartHandshake className="size-(--icon-lg)" strokeWidth={1.75} />
        </span>
        <h2 id="invite-title" className="type-h2 text-fg-default">
          Save for shared goals together
        </h2>
        <p className="type-body-lg text-fg-body">
          Invite your partner to save toward goals you both contribute to.
        </p>
        {/* The promise comes before the invite, not after (F10-01). */}
        <PrivacyNote />
        <InviteForm />
      </section>
    </>
  );
}

/** ADR-014: the inviter sees a declined or expired invitation, and can resend an expired one. */
function ClosedInvitation({ invitation }: { invitation: Invitation }) {
  const resend = useResendInvitation();
  const online = useOnline();
  const toast = useToast();
  const declined = invitation.status === 'declined';
  return (
    <section aria-labelledby="closed-title" className={card}>
      <h2 id="closed-title" className="flex items-center gap-2 type-h3 text-fg-default">
        {declined ? (
          <X aria-hidden className="size-(--icon-md)" strokeWidth={2} />
        ) : (
          <Clock aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
        )}
        {declined ? 'Declined' : 'Invitation expired'}
      </h2>
      <p className="type-body-lg text-fg-body">
        {declined
          ? `${invitation.invitee} declined your invitation. You can invite someone else below.`
          : `Your invitation to ${invitation.invitee} expired on ${day(invitation.expires_at)}.`}
      </p>
      {!declined && (
        <Button
          variant="secondary"
          className="self-start"
          loading={resend.isPending}
          disabled={!online}
          onClick={() => {
            resend.mutate(invitation.id, {
              onSuccess: () => {
                toast({ message: 'Invitation sent again' });
              },
            });
          }}
        >
          Resend invitation
        </Button>
      )}
      {resend.isError && <FormNotice tone="error">We couldn't resend it. Try again.</FormNotice>}
    </section>
  );
}

function Pending({ invitation }: { invitation: Invitation }) {
  const resend = useResendInvitation();
  const cancel = useCancelInvitation();
  const online = useOnline();
  const toast = useToast();
  const Icon = invitation.invitee_kind === 'email' ? Mail : Phone;
  return (
    <section aria-labelledby="pending-title" className={card}>
      <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-status-atrisk-bg px-2.5 py-0.5 type-caption text-status-atrisk-fg">
        <Clock aria-hidden className="size-(--icon-sm)" strokeWidth={2} />
        Invitation pending
      </span>
      <h2 id="pending-title" className="type-h2 text-fg-default">
        Waiting for your partner
      </h2>
      <dl className="flex flex-col gap-2 type-body-lg">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Sent to</dt>
          <Icon aria-hidden className="size-(--icon-md) text-fg-muted" strokeWidth={1.75} />
          <dd className="break-all text-fg-default">{invitation.invitee}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-fg-muted">Expires</dt>
          <dd className="text-fg-default">{day(invitation.expires_at)}</dd>
        </div>
      </dl>
      <p className="type-body-sm text-fg-body">
        Shared goals appear here after your partner accepts.
      </p>
      <PrivacyNote />
      {(resend.isError || cancel.isError) && (
        <FormNotice tone="error">We couldn't do that. Try again.</FormNotice>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          loading={resend.isPending}
          disabled={!online || cancel.isPending}
          onClick={() => {
            resend.mutate(invitation.id, {
              onSuccess: () => {
                toast({ message: 'Invitation sent again' });
              },
            });
          }}
        >
          Resend
        </Button>
        <Button
          variant="tertiary"
          loading={cancel.isPending}
          disabled={!online || resend.isPending}
          onClick={() => {
            cancel.mutate(invitation.id, {
              onSuccess: () => {
                toast({ message: 'Invitation cancelled. The link no longer works.' });
              },
            });
          }}
        >
          Cancel invitation
        </Button>
      </div>
    </section>
  );
}

function Connected({
  state,
  partnerName,
  since,
}: {
  state: CoupleState;
  partnerName: string;
  since: string;
}) {
  const shared = useGoals('ours');
  const today = useToday();
  const { byCode } = useCurrencies();
  const online = useOnline();
  const name = firstName(partnerName);
  const active = (shared.data ?? []).filter(
    (g) => g.archived_at === null && g.completed_at === null,
  );
  return (
    <>
      <section aria-labelledby="connected-title" className={card}>
        <span
          aria-hidden
          className="inline-grid size-(--icon-tile-lg) place-items-center rounded-full bg-secondary-50 text-saving"
        >
          <HeartHandshake className="size-(--icon-lg)" strokeWidth={1.75} />
        </span>
        <h2 id="connected-title" className="type-h2 text-fg-default">
          You &amp; {name}
        </h2>
        <p className="type-body-lg text-fg-body">Connected since {day(since)}.</p>
        <PrivacyNote />
      </section>

      <section aria-labelledby="shared-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="shared-title" className="type-h3 text-fg-default">
            Our goals ({state.shared_goal_count})
          </h2>
          <Link href="/goals?tab=ours" className="type-label text-fg-link underline">
            All shared goals
          </Link>
        </div>
        {shared.isPending ? (
          <LoadingSkeleton shape="goal-card" count={2} label="Loading shared goals" />
        ) : active.length === 0 ? (
          <p className="type-body-lg text-fg-body">
            No shared goals yet. You and {name} can save toward something together.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.slice(0, 3).map((g) => (
              <li key={g.id}>
                <GoalCard
                  compact
                  href={`/goals/${g.id}`}
                  goal={goalCardData(g, today, byCode.get(g.currency))}
                />
              </li>
            ))}
          </ul>
        )}
        <Link href="/goals/new?type=couple" className={`${primaryLink} self-start`}>
          Create shared goal
        </Link>
      </section>

      {online ? (
        <EndConnectionDialog partnerName={partnerName} />
      ) : (
        <p className="type-body-sm text-fg-muted">{OFFLINE_BLOCKED}</p>
      )}
    </>
  );
}
