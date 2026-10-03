'use client';

import { endpoints } from '@spendtogether/schemas';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { FormNotice } from '@/components/ui/form-message';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { apiClient } from '@/lib/api-client';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED } from '@/lib/couple';
import { useMe } from '@/lib/queries';
import { LogOutButton } from './log-out-button';

// F11-07 Security & account (FR-03, WAC-02). The contract has no change-password call, so
// changing a password sends the reset link to the account's own email or phone (D-87):
// whoever holds the session must also hold the inbox. Log out clears everything.

const card = 'flex flex-col gap-3 rounded-lg border border-border-default bg-bg-card p-4';

export function SecuritySettings() {
  const me = useMe();
  const online = useOnline();
  const reset = useMutation({
    mutationFn: (identifier: string) =>
      apiClient.call(endpoints.forgotPassword, { body: { identifier } }),
  });

  if (me.isPending) return <LoadingSkeleton shape="card" label="Loading security settings" />;
  if (me.isError) {
    return (
      <ErrorState message="We couldn't load your account." onRetry={() => void me.refetch()} />
    );
  }
  const identifier = me.data.email ?? me.data.phone;
  // FR-04: email accounts get a link, phone accounts a code by text.
  const what = me.data.email ? 'a link' : 'a code';

  return (
    <div className="mx-auto flex w-full max-w-(--dialog-max) flex-col gap-6">
      <section aria-labelledby="password-title" className={card}>
        <h2 id="password-title" className="flex items-center gap-2 type-h3 text-fg-default">
          <KeyRound aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
          Change password
        </h2>
        {identifier ? (
          <>
            <p className="type-body-lg text-fg-body">
              We&apos;ll send {what} to{' '}
              <span className="break-all text-fg-default">{identifier}</span>. Use it to choose a
              new password.
            </p>
            {reset.isSuccess ? (
              <FormNotice tone="success">
                Sent to {identifier}. Use it to choose a new password.
              </FormNotice>
            ) : (
              <Button
                variant="secondary"
                className="self-start"
                loading={reset.isPending}
                disabled={!online}
                onClick={() => {
                  reset.mutate(identifier);
                }}
              >
                {me.data.email ? 'Send password link' : 'Send password code'}
              </Button>
            )}
            {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
            {reset.isError && (
              <FormNotice tone="error">We couldn&apos;t send it. Try again.</FormNotice>
            )}
          </>
        ) : (
          <p className="type-body-lg text-fg-body">
            Your account has no email or phone to send a link to.
          </p>
        )}
      </section>

      <section aria-labelledby="logout-title" className={card}>
        <h2 id="logout-title" className="flex items-center gap-2 type-h3 text-fg-default">
          <LogOut aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
          Log out
        </h2>
        <p className="type-body-lg text-fg-body">
          Logging out removes your data from this device. Your account and entries stay safe.
        </p>
        <LogOutButton className="self-start" />
      </section>
    </div>
  );
}
