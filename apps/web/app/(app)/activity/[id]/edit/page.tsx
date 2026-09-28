import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// Edit transaction `/activity/[id]/edit`.
export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader
        title="Edit transaction"
        back={{ href: `/activity/${id}`, label: 'Transaction' }}
      />
      <ComingInPhase
        phase="F7"
        what="The same form as Add, prefilled; changing amount, currency or date re-converts."
      />
    </>
  );
}
