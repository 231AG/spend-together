import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/features/auth/password-reset';

// SCR-06 step 1 `/forgot-password` (FR-04).
export default function Page() {
  return (
    <>
      <h1 className="type-h2">Reset your password</h1>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </>
  );
}
