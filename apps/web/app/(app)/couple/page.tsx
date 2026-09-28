import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// SCR-19 Couple `/couple`.
export default function CouplePage() {
  return (
    <>
      <PageHeader title="Couple" back={{ href: '/profile', label: 'Profile' }} />
      <ComingInPhase
        phase="F10"
        what="Invite your partner, see your connection and shared goals, or end the couple. Your partner never sees your own income, expenses or goals."
      />
    </>
  );
}
