'use client';

import { useId } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { FormNotice } from '@/components/ui/form-message';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED } from '@/lib/couple';
import { useMe, usePatchMe } from '@/lib/queries';

// F11-06 (FR-26): exactly the two switches in `profiles.notify_email`, no third. The
// invitation email itself is not optional, so it has no switch, only a sentence.

const TOGGLES = [
  {
    key: 'invite_accepted',
    label: 'Your partner accepts your invitation',
  },
  {
    key: 'goal_completed',
    label: 'A shared goal is completed',
  },
] as const;

export function NotificationSettings() {
  const me = useMe();
  const online = useOnline();
  const patch = usePatchMe();
  const id = useId();

  if (me.isPending) return <LoadingSkeleton shape="row" count={2} label="Loading notifications" />;
  if (me.isError) {
    return (
      <ErrorState
        message="We couldn't load your notification settings."
        onRetry={() => void me.refetch()}
      />
    );
  }
  const current =
    patch.isPending && patch.variables.notify_email
      ? patch.variables.notify_email
      : me.data.notify_email;

  return (
    <div className="mx-auto flex w-full max-w-(--dialog-max) flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 type-h3 text-fg-default">Email me when</legend>
        <ul className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default bg-bg-card">
          {TOGGLES.map(({ key, label }) => {
            const on = current[key];
            return (
              <li key={key} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <input
                  id={`${id}-${key}`}
                  type="checkbox"
                  checked={on}
                  disabled={!online || patch.isPending}
                  onChange={() => {
                    patch.mutate({ notify_email: { ...current, [key]: !on } });
                  }}
                  className="size-5 accent-primary-700"
                />
                <label htmlFor={`${id}-${key}`} className="flex-1 type-body-lg text-fg-default">
                  {label}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <p className="type-body-sm text-fg-body">
        Invitations themselves are always sent by email or text, so your partner can join.
      </p>
      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
      {patch.isError && (
        <FormNotice tone="error">We couldn&apos;t save that. Try again.</FormNotice>
      )}
    </div>
  );
}
