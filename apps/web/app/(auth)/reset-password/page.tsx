import { AuthPlaceholder } from '@/components/features/public/auth-placeholder';

// Reset password `/reset-password` (token from the email link or SMS).
export default function ResetPasswordPage() {
  return (
    <AuthPlaceholder
      title="Choose a new password"
      what="A new password of at least 10 characters."
    />
  );
}
