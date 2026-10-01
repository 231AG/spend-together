import { Suspense } from 'react';
import { HomeGreeting } from '@/components/features/home/home-greeting';
import { HomeView } from '@/components/features/home/home-view';
import { HomePeriodControl } from '@/components/features/route-views';
import { PageHeader } from '@/components/layout/page-header';

// SCR-08 Home `/home?period=today|week|month` (default month).
export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Home"
        subtitle={<HomeGreeting />}
        actions={
          <Suspense>
            <HomePeriodControl />
          </Suspense>
        }
      />
      <Suspense>
        <HomeView />
      </Suspense>
    </>
  );
}
