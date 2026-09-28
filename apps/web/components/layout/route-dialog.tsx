'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { focusGlobalAdd } from '@/components/features/add-sheet';

// F5-05: the dialog an intercepted route renders. Closing it goes Back, so the browser's
// Back button and the dialog's close button are the same action, and Forward reopens it
// (§12.2). Bottom sheet below 768 px, centred 480 px dialog above (§21).

export function RouteDialog({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        setOpen(false);
        router.back();
      }}
      title={title}
      {...(description ? { description } : {})}
      presentation="responsive"
      onCloseAutoFocus={(event) => {
        // The opener (a row in the Add sheet) is gone; return focus to the global Add.
        if (focusGlobalAdd()) event.preventDefault();
      }}
    >
      {children}
    </Dialog>
  );
}
