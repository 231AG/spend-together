'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { focusGlobalAdd } from '@/components/features/add-sheet';

// F5-05: the dialog an intercepted route renders. Closing it goes Back, so the browser's
// Back button and the dialog's close button are the same action, and Forward reopens it
// (§12.2). Bottom sheet below 768 px, centred 480 px dialog above (§21).

const CloseContext = createContext<(() => void) | null>(null);

// Set when a route dialog closes: its Back navigation must not have its focus return
// overridden by RouteFocus, whichever of the two runs first. Read once, then reset.
let dialogFocusReturn = false;

export function consumeDialogFocusReturn(): boolean {
  const claimed = dialogFocusReturn;
  dialogFocusReturn = false;
  return claimed;
}

/** Inside a route dialog: close it the same way Esc does (Back). Null on a full page. */
export function useCloseRouteDialog(): (() => void) | null {
  return useContext(CloseContext);
}

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
  const close = () => {
    dialogFocusReturn = true;
    setOpen(false);
    router.back();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={title}
      {...(description ? { description } : {})}
      presentation="responsive"
      onCloseAutoFocus={(event) => {
        // The opener (a row in the Add sheet) is gone; return focus to the global Add.
        if (focusGlobalAdd()) event.preventDefault();
      }}
    >
      <CloseContext.Provider value={close}>{children}</CloseContext.Provider>
    </Dialog>
  );
}
