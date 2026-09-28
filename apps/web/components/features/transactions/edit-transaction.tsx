'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { TransactionGate } from './transaction-details';
import { TransactionForm } from './transaction-form';

// F7-08 (FR-08): the Add form prefilled. Changing amount, currency or date re-converts on
// the server; every affected period refreshes through the shared invalidation.

export function EditTransaction({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const search = params.toString();
  return (
    <TransactionGate id={id}>
      {(t) => (
        <TransactionForm
          type={t.type}
          initial={t}
          onSaved={() => {
            toast({ message: 'Changes saved' });
            router.replace(`/activity/${id}${search ? `?${search}` : ''}`);
          }}
        />
      )}
    </TransactionGate>
  );
}
