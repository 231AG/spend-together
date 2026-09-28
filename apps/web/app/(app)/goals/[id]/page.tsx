import Link from 'next/link';
import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-17 Goal details `/goals/[id]`.
export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Goal" back={{ href: '/goals', label: 'Goals' }} />
      <div className="flex flex-col gap-4">
        <ComingInPhase
          phase="F9"
          what="Balance, remaining, required and current pace, projected completion, status, contributors and history."
        />
        <div className="flex flex-wrap gap-4">
          <Link
            href={`/goals/${id}/contribute`}
            className="inline-flex min-h-(--touch-min) items-center rounded-md bg-action-primary-bg px-4 type-label text-action-primary-fg hover:bg-action-primary-bg-hover"
          >
            Add contribution
          </Link>
          <Link
            href={`/goals/${id}/edit`}
            className="inline-flex min-h-(--touch-min) items-center type-label text-fg-link underline"
          >
            Edit goal
          </Link>
        </div>
      </div>
    </>
  );
}
