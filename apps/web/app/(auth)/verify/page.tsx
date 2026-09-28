import { Suspense } from 'react';
import { VerifyForm } from '@/components/features/auth/verify-form';

// Verification `/verify` (§7.1, ADR-012 resend).
export default function Page() {
  return (
    <>
      <h1 className="type-h2">Confirm it's you</h1>
      <Suspense>
        <VerifyForm />
      </Suspense>
    </>
  );
}
