import { Suspense } from 'react';
import { InvitationLanding } from '@/components/features/couple/invitation-landing';

// SCR-20 Invitation landing `/invite/[token]`: shows the inviter's first name only, then
// Accept / Decline, or register or log in and come back to accept (§12.1).
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense>
      <InvitationLanding token={token} />
    </Suspense>
  );
}
