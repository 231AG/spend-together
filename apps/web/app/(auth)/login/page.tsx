import { Suspense } from 'react';
import { LoginForm } from '@/components/features/auth/login-form';

// SCR-05 Login `/login` (FR-02).
export default function Page() {
  return (
    <>
      <h1 className="type-h2">Log in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
