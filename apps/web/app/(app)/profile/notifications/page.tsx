import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// Notifications `/profile/notifications` (FR-26).
export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" back={{ href: '/profile', label: 'Profile' }} />
      <ComingInPhase
        phase="F11"
        what="Emails when your partner accepts an invitation and when a shared goal is completed."
      />
    </>
  );
}
