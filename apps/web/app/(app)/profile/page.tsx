import { Suspense } from 'react';
import { ProfileView } from '@/components/features/profile/profile-view';
import { PageHeader } from '@/components/layout/page-header';

// SCR-21 Profile & settings `/profile` (F11-01, F11-08).
export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <Suspense>
        <ProfileView />
      </Suspense>
    </>
  );
}
