import { Suspense } from 'react';
import { NotificationSettings } from '@/components/features/profile/notification-settings';
import { PageHeader } from '@/components/layout/page-header';

// Notifications `/profile/notifications` (F11-06).
export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" back={{ href: '/profile', label: 'Profile' }} />
      <Suspense>
        <NotificationSettings />
      </Suspense>
    </>
  );
}
