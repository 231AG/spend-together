import { ContributionFormPlaceholder } from '@/components/features/form-placeholders';
import { CancelLink } from '@/components/features/route-views';
import { PageHeader } from '@/components/layout/page-header';

// SCR-18 as a full page (direct link or refresh); from the app it opens as a dialog.
export default async function ContributePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Add contribution" back={{ href: `/goals/${id}`, label: 'Goal' }} />
      <div className="flex max-w-(--dialog-max) flex-col gap-4">
        <ContributionFormPlaceholder />
        <CancelLink href={`/goals/${id}`} />
      </div>
    </>
  );
}
