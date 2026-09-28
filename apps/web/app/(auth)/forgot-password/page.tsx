import { AuthPlaceholder } from '@/components/features/public/auth-placeholder';

// SCR-06 Forgot password `/forgot-password`.
export default function ForgotPasswordPage() {
  return (
    <AuthPlaceholder
      title="Reset your password"
      what="Enter your email or phone and we'll send a link or code. The answer is the same whether or not the account exists."
    />
  );
}
