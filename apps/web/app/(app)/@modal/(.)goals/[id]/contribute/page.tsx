import { ContributionFormPlaceholder } from '@/components/features/form-placeholders';
import { RouteDialog } from '@/components/layout/route-dialog';

// Intercepted /goals/[id]/contribute: the contribution form as a dialog (§14.1 @modal).
export default function ContributeDialog() {
  return (
    <RouteDialog title="Add contribution">
      <ContributionFormPlaceholder />
    </RouteDialog>
  );
}
