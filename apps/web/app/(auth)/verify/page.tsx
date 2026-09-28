import { AuthPlaceholder } from '@/components/features/public/auth-placeholder';

// Verify `/verify` (email link or phone code).
export default function VerifyPage() {
  return (
    <AuthPlaceholder
      title="Confirm it's you"
      what="Enter the code we sent, or open the link in your email."
    />
  );
}
