import { Suspense } from 'react';
import { TransactionDetails } from '@/components/features/transactions/transaction-details';
import { PageHeader } from '@/components/layout/page-header';

// SCR-13 Transaction details `/activity/[id]` (beside the list from 1024 px).
export default async function TransactionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const search = new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])),
  ).toString();
  return (
    <>
      <PageHeader
        title="Transaction"
        back={{ href: `/activity${search ? `?${search}` : ''}`, label: 'Activity' }}
      />
      <Suspense>
        <TransactionDetails id={id} />
      </Suspense>
    </>
  );
}
