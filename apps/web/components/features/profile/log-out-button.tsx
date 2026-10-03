'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { pendingOfflineEntries, signOut } from '@/lib/session';

// F11-07 (FR-03, WAC-02): log out clears the session, the query cache and offline stores.
// Unsynced entries would be lost, so the person is warned first and can stay.

export function LogOutButton({ className }: { className?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [unsynced, setUnsynced] = useState(0);
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    try {
      await signOut(qc);
    } finally {
      router.replace('/');
    }
  }

  return (
    <>
      <Button
        variant="tertiary"
        loading={busy}
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
    </>
  );
}
