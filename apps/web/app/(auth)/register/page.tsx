import { AuthPlaceholder } from '@/components/features/public/auth-placeholder';

// SCR-04 Register `/register`.
export default function RegisterPage() {
  return (
    <AuthPlaceholder
      title="Create your account"
      what="Name, email or phone, and a password of at least 10 characters. Already have an account? Log in."
    />
  );
}
