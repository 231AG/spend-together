import { Suspense } from 'react';
import { InsightsPeriodControl } from '@/components/features/route-views';
import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-14 Insights `/insights?period=daily|weekly|monthly&date=`.
export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" />
      <div className="flex flex-col gap-6">
        <Suspense>
          <InsightsPeriodControl />
        </Suspense>
        <ComingInPhase
          phase="F8"
          what="Metrics with comparisons to the previous period, the spending trend, income against expenses and the category breakdown, each with a table view."
        />
      </div>
    </>
  );
}
