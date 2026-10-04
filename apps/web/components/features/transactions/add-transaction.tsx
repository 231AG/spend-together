'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useCloseRouteDialog } from '@/components/layout/route-dialog';
import { SAVED_OFFLINE } from '@/lib/offline-entry';
import { TransactionForm, type TransactionType } from './transaction-form';

// SCR-10/11 in either presentation (F7-01/02): inside the intercepted route dialog it
// closes like Esc (Back, focus to the global Add); as a full page it returns Home. The
// toast is the only confirmation: no celebratory motion (§13).

export function AddTransaction({ type }: { type: TransactionType }) {
  const router = useRouter();
  const toast = useToast();
  const closeDialog = useCloseRouteDialog();
  return (
    <TransactionForm
      type={type}
      onSaved={(_saved, outcome) => {
        toast({
          message:
            outcome === 'queued'
              ? SAVED_OFFLINE
              : type === 'income'
                ? 'Income added'
                : 'Expense added',
        });
        if (closeDialog) closeDialog();
        else router.replace('/home');
      }}
    />
  );
}
