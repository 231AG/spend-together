import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/features/auth/password-reset';

// SCR-06 step 2 `/reset-password?token=` (FR-04).
export default function Page() {
  return (
    <>
      <h1 className="type-h2">Choose a new password</h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
