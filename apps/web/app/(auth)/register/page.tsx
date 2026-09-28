import { Suspense } from 'react';
import { RegisterForm } from '@/components/features/auth/register-form';

// SCR-04 Register `/register` (FR-01).
export default function Page() {
  return (
    <>
      <h1 className="type-h2">Create your account</h1>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </>
  );
}
