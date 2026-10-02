import { AddContribution } from '@/components/features/goals/add-contribution';
import { RouteDialog } from '@/components/layout/route-dialog';

// Intercepted /goals/[id]/contribute: the contribution form as a dialog (§14.1 @modal).
export default async function ContributeDialog({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RouteDialog title="Add contribution">
      <AddContribution goalId={id} />
    </RouteDialog>
  );
}
