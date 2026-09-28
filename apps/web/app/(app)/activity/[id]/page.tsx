import Link from 'next/link';
import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-13 Transaction details `/activity/[id]`.
export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Transaction" back={{ href: '/activity', label: 'Activity' }} />
      <div className="flex flex-col gap-4">
        <ComingInPhase
          phase="F7"
          what="The full record with its original and converted amounts, and Edit and Delete with Undo."
        />
        <Link
          href={`/activity/${id}/edit`}
          className="self-start type-label text-fg-link underline"
        >
          Edit transaction
        </Link>
      </div>
    </>
  );
}
