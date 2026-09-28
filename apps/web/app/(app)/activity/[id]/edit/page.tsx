import { Suspense } from 'react';
import { EditTransaction } from '@/components/features/transactions/edit-transaction';
import { PageHeader } from '@/components/layout/page-header';

// Edit transaction `/activity/[id]/edit` (F7-08).
export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader
        title="Edit transaction"
        back={{ href: `/activity/${id}`, label: 'Transaction' }}
      />
      <div className="max-w-(--dialog-max)">
        <Suspense>
          <EditTransaction id={id} />
        </Suspense>
      </div>
    </>
  );
}
