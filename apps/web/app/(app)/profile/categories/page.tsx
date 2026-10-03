import { Suspense } from 'react';
import { CategoriesView } from '@/components/features/profile/categories-view';
import { PageHeader } from '@/components/layout/page-header';

// SCR-22 Categories `/profile/categories` (F11-02).
export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" back={{ href: '/profile', label: 'Profile' }} />
      <Suspense>
        <CategoriesView />
      </Suspense>
    </>
  );
}
