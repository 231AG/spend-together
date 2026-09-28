import { Suspense } from 'react';
import { HomePeriodControl } from '@/components/features/route-views';
import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-08 Home `/home?period=today|week|month` (default month).
export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Home"
        actions={
          <Suspense>
            <HomePeriodControl />
          </Suspense>
        }
      />
      <ComingInPhase
        phase="F8"
        what="Your remaining cash flow, income, expenses, savings and savings rate for the period, where your money went, active goals and recent activity."
      />
    </>
  );
}
