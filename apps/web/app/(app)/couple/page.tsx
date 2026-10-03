import { Suspense } from 'react';
import { CoupleView } from '@/components/features/couple/couple-view';
import { PageHeader } from '@/components/layout/page-header';

// SCR-19 Couple `/couple`.
export default function CouplePage() {
  return (
    <>
      <PageHeader title="Couple" back={{ href: '/profile', label: 'Profile' }} />
      <Suspense>
        <CoupleView />
      </Suspense>
    </>
  );
}
