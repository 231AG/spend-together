import { Suspense } from 'react';
import { SecuritySettings } from '@/components/features/profile/security-settings';
import { PageHeader } from '@/components/layout/page-header';

// Security `/profile/security` (F11-07).
export default function SecurityPage() {
  return (
    <>
      <PageHeader title="Security" back={{ href: '/profile', label: 'Profile' }} />
      <Suspense>
        <SecuritySettings />
      </Suspense>
    </>
  );
}
