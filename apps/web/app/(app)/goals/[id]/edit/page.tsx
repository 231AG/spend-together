import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// Edit goal `/goals/[id]/edit` (name, target, date, icon; currency is fixed, BR-15).
export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Edit goal" back={{ href: `/goals/${id}`, label: 'Goal' }} />
      <ComingInPhase
        phase="F9"
        what="Change the name, target amount, target date or icon. The goal's currency can't change."
      />
    </>
  );
}
