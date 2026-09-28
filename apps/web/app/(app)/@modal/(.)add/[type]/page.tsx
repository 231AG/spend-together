import { notFound } from 'next/navigation';
import { ADD_TITLES, isAddType } from '@/components/features/form-placeholders';
import { AddTransaction } from '@/components/features/transactions/add-transaction';
import { RouteDialog } from '@/components/layout/route-dialog';

// Intercepted /add/[type]: the form as a dialog over the current page (F5-05).
export default async function AddDialog({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isAddType(type)) notFound();
  return (
    <RouteDialog title={ADD_TITLES[type]}>
      <AddTransaction type={type} />
    </RouteDialog>
  );
}
