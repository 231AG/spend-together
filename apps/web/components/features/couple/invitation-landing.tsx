'use client';

import type { PublicInvitation } from '@spendtogether/schemas';
import { HeartHandshake, Lock } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { linkButton } from '@/components/ui/link-button';
import { ErrorState } from '@/components/ui/error-state';
import { FormNotice } from '@/components/ui/form-message';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-client';
import { useOnline } from '@/lib/connectivity';
import { INVITE_PRIVACY, OFFLINE_BLOCKED, dayOf } from '@/lib/couple';
import { isUnauthenticated, useCouple, useInvitation, useMe } from '@/lib/queries';
import { useAcceptInvitation, useDeclineInvitation } from './use-couple-actions';

// SCR-20 (F10-05, F10-06, FR-19). The public landing knows the inviter's first name and
// nothing else. Signed in: Accept or Decline (unless you're already connected, which is
// explained). Signed out: Create account or Log in, returning here to accept.

const primary = linkButton('primary', 'lg');
const secondary = linkButton('secondary', 'lg');

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-(--dialog-max) flex-col items-center gap-5 rounded-xl bg-bg-card p-6 text-center shadow-elev-1">
      <span
        aria-hidden
        className="inline-grid size-(--icon-tile-lg) place-items-center rounded-full bg-secondary-50 text-saving"
      >
        <HeartHandshake className="size-(--icon-lg)" strokeWidth={1.75} />
      </span>
      <h1 className="type-h1 text-fg-default">{title}</h1>
      {children}
    </div>
  );
}

export function InvitationLanding({ token }: { token: string }) {
  const invitation = useInvitation(token);
  if (invitation.isPending) return <LoadingSkeleton shape="card" label="Loading invitation" />;
  if (invitation.isError) {
    if (invitation.error instanceof ApiError && invitation.error.status === 404) {
      return (
        <Shell title="This invitation link isn't valid">
          <p className="type-body-lg text-fg-body">
            It may have been cancelled or mistyped. Ask the person who invited you to send a new
            one.
          </p>
          <Link href="/" className={secondary}>
            Go to SpendTogether
          </Link>
        </Shell>
      );
    }
    return (
      <ErrorState
        message="We couldn't load this invitation."
        onRetry={() => void invitation.refetch()}
        retrying={invitation.isFetching}
      />
    );
  }
  return <Loaded token={token} invitation={invitation.data} />;
}

function Loaded({ token, invitation }: { token: string; invitation: PublicInvitation }) {
  const name = invitation.inviter_first_name;
  const me = useMe();
  const signedOut = isUnauthenticated(me.error);

  if (invitation.status === 'expired') {
    return (
      <Shell title="This invitation has expired">
        <p className="type-body-lg text-fg-body">
          It expired on {dayOf(invitation.expires_at, me.data?.timezone)}. Ask {name} to resend it.
        </p>
      </Shell>
    );
  }
  if (invitation.status === 'cancelled') {
    return (
      <Shell title="This invitation was cancelled">
        <p className="type-body-lg text-fg-body">
          {name} cancelled it. Ask them to send a new one if you'd like to connect.
        </p>
      </Shell>
    );
  }
  if (invitation.status === 'declined') {
    return (
      <Shell title="Invitation declined">
        <p className="type-body-lg text-fg-body">
          This invitation was declined. {name} can send a new one if you change your mind.
        </p>
      </Shell>
    );
  }
  if (invitation.status === 'accepted') {
    return (
      <Shell title="This invitation has been accepted">
        <p className="type-body-lg text-fg-body">It can only be used once.</p>
        {!signedOut && (
          <Link href="/goals?tab=ours" className={primary}>
            Go to our goals
          </Link>
        )}
      </Shell>
    );
  }

  return (
    <Shell title={`${name} invited you to save together on SpendTogether`}>
      <p className="flex items-start gap-2 rounded-md bg-bg-subtle p-3 text-left type-body-sm text-fg-body">
        <Lock aria-hidden className="mt-0.5 size-(--icon-sm) shrink-0" strokeWidth={1.75} />
        {INVITE_PRIVACY}
      </p>
      {me.isPending ? (
        <LoadingSkeleton shape="row" label="Checking your session" />
      ) : signedOut ? (
        <SignedOutActions token={token} />
      ) : (
        <Respond token={token} invitation={invitation} />
      )}
    </Shell>
  );
}

function SignedOutActions({ token }: { token: string }) {
  const next = encodeURIComponent(`/invite/${token}`);
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
      <Link href={`/register?next=${next}`} className={primary}>
        Create account
      </Link>
      <Link href={`/login?next=${next}`} className={secondary}>
        Log in
      </Link>
    </div>
  );
}

function Respond({ token, invitation }: { token: string; invitation: PublicInvitation }) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const couple = useCouple();
  const accept = useAcceptInvitation(token);
  const decline = useDeclineInvitation(token);
  const name = invitation.inviter_first_name;

  const mine = couple.data;
  if (mine?.status === 'pending' && mine.invitation?.id === invitation.invitation_id) {
    return (
      <p className="type-body-lg text-fg-body">
        This is the invitation you sent. Your partner opens this link to accept it.
      </p>
    );
  }
  if (mine?.status === 'active') {
    return (
      <FormNotice tone="error">
        You can't accept right now: you're already connected to a partner. You can be connected to
        one person at a time.
      </FormNotice>
    );
  }
  // An open invitation of your own blocks accepting another (BR-06); declining still works.
  const ownOpen = mine?.status === 'pending';

  const acceptConflict = accept.error instanceof ApiError && accept.error.code === 'CONFLICT';
  const declineConflict = decline.error instanceof ApiError && decline.error.code === 'CONFLICT';
  const failed = (accept.isError && !acceptConflict) || (decline.isError && !declineConflict);

  return (
    <div className="flex w-full flex-col gap-3">
      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
      {ownOpen && (
        <FormNotice tone="error">
          You have an open invitation of your own. Cancel it on your{' '}
          <Link href="/couple" className="underline">
            Couple page
          </Link>{' '}
          to accept this one.
        </FormNotice>
      )}
      {acceptConflict && (
        <FormNotice tone="error">
          This invitation can't be accepted right now. Ask {name} to send a new one.
        </FormNotice>
      )}
      {declineConflict && <FormNotice tone="error">This invitation is no longer open.</FormNotice>}
      {failed && <FormNotice tone="error">We couldn't do that. Try again.</FormNotice>}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          size="lg"
          loading={accept.isPending}
          disabled={!online || decline.isPending || ownOpen}
          onClick={() => {
            accept.mutate(invitation.invitation_id, {
              onSuccess: () => {
                toast({ message: `You're connected with ${name}.` });
                router.replace('/goals?tab=ours');
              },
            });
          }}
        >
          Accept
        </Button>
        <Button
          size="lg"
          variant="tertiary"
          loading={decline.isPending}
          disabled={!online || accept.isPending}
          onClick={() => {
            decline.mutate(invitation.invitation_id);
          }}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
