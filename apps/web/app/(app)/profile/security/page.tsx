import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// Security `/profile/security`.
export default function SecurityPage() {
  return (
    <>
      <PageHeader title="Security" back={{ href: '/profile', label: 'Profile' }} />
      <ComingInPhase phase="F11" what="Change your password and sign out of this device." />
    </>
  );
}
