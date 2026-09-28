import { AuthPlaceholder } from '@/components/features/public/auth-placeholder';

// SCR-05 Login `/login`.
export default function LoginPage() {
  return (
    <AuthPlaceholder
      title="Log in"
      what="Email or phone and password, with a Forgot password link."
    />
  );
}
