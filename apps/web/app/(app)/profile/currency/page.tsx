import { Suspense } from 'react';
import { CurrencySettings } from '@/components/features/profile/currency-settings';
import { PageHeader } from '@/components/layout/page-header';

// Base currency `/profile/currency` (F11-03, F11-09; §11.3).
export default function CurrencyPage() {
  return (
    <>
      <PageHeader title="Base currency" back={{ href: '/profile', label: 'Profile' }} />
      <Suspense>
        <CurrencySettings />
      </Suspense>
    </>
  );
}
