'use client';

import { X } from 'lucide-react';
import { Toast as RadixToast } from 'radix-ui';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Spec §14.3 Toast on Radix Toast: role="status", 5 s (the dur-toast token), pauses on
// hover and focus, and its action (e.g. Undo) is keyboard reachable: F8 jumps to the
// toast region and Tab reaches the action while the toast is open.

export interface ToastMessage {
  message: string;
  action?: { label: string; onAction: () => void; altText: string };
}

interface ToastEntry extends ToastMessage {
  id: number;
}

const ToastContext = createContext<((toast: ToastMessage) => void) | null>(null);

/** 5 s, the dur-toast token; Radix needs the number, so it is mirrored here. */
export const TOAST_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const show = useCallback((toast: ToastMessage) => {
    setToasts((all) => [...all, { ...toast, id: (all.at(-1)?.id ?? 0) + 1 }]);
  }, []);
  const remove = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider duration={TOAST_DURATION_MS} label="Notifications">
        {children}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => {
              remove(toast.id);
            }}
          />
        ))}
        <RadixToast.Viewport className="fixed inset-x-0 bottom-(--tabbar-total) z-(--z-toast) m-0 flex list-none flex-col items-center gap-2 p-4 md:bottom-0 md:left-auto md:items-end" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }: { toast: ToastEntry; onClose: () => void }) {
  return (
    <RadixToast.Root
      type="foreground"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className="flex w-full max-w-(--dialog-max) items-center gap-3 rounded-lg bg-neutral-900 py-2 pl-4 pr-2 text-fg-on-action shadow-elev-3"
    >
      <RadixToast.Description className="flex-1 type-body-sm">
        {toast.message}
      </RadixToast.Description>
      {toast.action && (
        <RadixToast.Action
          altText={toast.action.altText}
          onClick={toast.action.onAction}
          className="min-h-(--touch-min) rounded-md px-3 type-label text-primary-100 hover:bg-neutral-700"
        >
          {toast.action.label}
        </RadixToast.Action>
      )}
      <RadixToast.Close
        aria-label="Dismiss"
        className="inline-grid size-(--touch-min) place-items-center rounded-full hover:bg-neutral-700"
      >
        <X aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

/** Show a toast: `toast({ message: 'Expense deleted', action: { label: 'Undo', … } })`. */
export function useToast(): (toast: ToastMessage) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}
