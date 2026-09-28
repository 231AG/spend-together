import { notFound } from 'next/navigation';
import { ADD_TITLES, isAddType } from '@/components/features/form-placeholders';
import { AddTransaction } from '@/components/features/transactions/add-transaction';
import { CancelLink } from '@/components/features/route-views';
import { PageHeader } from '@/components/layout/page-header';

// SCR-10/11 as a full page: a direct link or a refresh renders this, not the dialog.
export default async function AddPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isAddType(type)) notFound();
  return (
    <>
      <PageHeader title={ADD_TITLES[type]} back={{ href: '/home', label: 'Home' }} />
      <div className="flex max-w-(--dialog-max) flex-col gap-4">
        <AddTransaction type={type} />
        <CancelLink href="/home" />
      </div>
    </>
  );
}
