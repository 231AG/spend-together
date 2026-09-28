import { ComingInPhase } from '@/components/layout/page-header';

// SCR-20 Invitation landing `/invite/[token]`: shows the inviter's first name only, then
// routes to register or log in, then accept (§12.1).
export default function InvitePage() {
  return (
    <>
      <h1 className="type-h1">You've been invited</h1>
      <ComingInPhase
        phase="F10"
        what="Who invited you (first name only), and Create account or Log in to accept. Your partner never sees your own finances."
      />
    </>
  );
}
