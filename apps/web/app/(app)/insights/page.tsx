import { Suspense } from 'react';
import { InsightsView } from '@/components/features/insights/insights-view';
import { PageHeader } from '@/components/layout/page-header';

// SCR-14 Insights `/insights?period=daily|weekly|monthly&date=`.
export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" />
      <Suspense>
        <InsightsView />
      </Suspense>
    </>
  );
}
