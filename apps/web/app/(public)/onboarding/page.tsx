import Link from 'next/link';
import { ComingInPhase } from '@/components/layout/page-header';

// SCR-03 Onboarding `/onboarding` (three pages, skippable).
export default function OnboardingPage() {
  return (
    <>
      <h1 className="type-h1">Welcome to SpendTogether</h1>
      <ComingInPhase
        phase="F6"
        what="Three short pages: track income and expenses, understand your patterns, and save alone or together."
      />
      <Link href="/register" className="self-start type-label text-fg-link underline">
        Skip to create an account
      </Link>
    </>
  );
}
