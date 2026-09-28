'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

// §14.1: one imperative ConfirmationDialog for the whole app.
//   const confirm = useConfirm();
//   if (await confirm({ title, consequences, confirmLabel, destructive: true })) …

export interface ConfirmOptions {
  title: string;
  consequences: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  cancelLabel?: string;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
  const confirm = useContext(Ctx);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  const value = useMemo(() => confirm, [confirm]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {options && (
        <ConfirmationDialog
          open
          onOpenChange={(open) => {
            if (!open) settle(false);
          }}
          title={options.title}
          consequences={options.consequences}
          confirmLabel={options.confirmLabel}
          destructive={options.destructive ?? false}
          {...(options.cancelLabel ? { cancelLabel: options.cancelLabel } : {})}
          onConfirm={() => {
            settle(true);
          }}
        />
      )}
    </Ctx.Provider>
  );
}
