'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FormNotice } from '@/components/ui/form-message';
import { useOnline } from '@/lib/connectivity';
import { OFFLINE_BLOCKED } from '@/lib/couple';
import { pendingOfflineEntries, signOut } from '@/lib/session';

// F11-07 (FR-03, WAC-02): log out clears the session, the query cache and offline stores.
// Unsynced entries would be lost, so the person is warned first and can stay. The server
// must end the session, so logging out needs a connection; a failure clears nothing.

export function LogOutButton({ className }: { className?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const online = useOnline();
  const [unsynced, setUnsynced] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function leave() {
    setBusy(true);
    setFailed(false);
    try {
      await signOut(qc);
      router.replace('/');
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="tertiary"
        loading={busy}
        disabled={!online}
        {...(className ? { className } : {})}
        onClick={() => {
          void pendingOfflineEntries().then((n) => {
            if (n > 0) setUnsynced(n);
            else void leave();
          });
        }}
      >
        Log out
      </Button>
      {!online && <FormNotice tone="offline">{OFFLINE_BLOCKED}</FormNotice>}
      {failed && (
        <FormNotice tone="error">
          We couldn&apos;t log you out. Check your connection and try again.
        </FormNotice>
      )}
      <ConfirmationDialog
        open={unsynced > 0}
        onOpenChange={(open) => {
          if (!open) setUnsynced(0);
        }}
        title="Log out and lose unsynced entries?"
        consequences={`${String(unsynced)} ${unsynced === 1 ? "entry hasn't" : "entries haven't"} synced. Log out anyway and lose ${unsynced === 1 ? 'it' : 'them'}?`}
        confirmLabel="Log out anyway"
        cancelLabel="Stay logged in"
        destructive
        onConfirm={() => void leave()}
      />
    </div>
  );
}
