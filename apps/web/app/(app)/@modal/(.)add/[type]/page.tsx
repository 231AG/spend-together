import { notFound } from 'next/navigation';
import {
  ADD_TITLES,
  TransactionFormPlaceholder,
  isAddType,
} from '@/components/features/form-placeholders';
import { RouteDialog } from '@/components/layout/route-dialog';

// Intercepted /add/[type]: the form as a dialog over the current page (F5-05).
export default async function AddDialog({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isAddType(type)) notFound();
  return (
    <RouteDialog title={ADD_TITLES[type]}>
      <TransactionFormPlaceholder type={type} />
    </RouteDialog>
  );
}
