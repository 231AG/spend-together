import { ComingInPhase, PageHeader } from '@/components/layout/page-header';

// Base currency `/profile/currency` (§11.3).
export default function CurrencyPage() {
  return (
    <>
      <PageHeader title="Base currency" back={{ href: '/profile', label: 'Profile' }} />
      <ComingInPhase
        phase="F11"
        what="Choose the currency your totals are shown in. Past entries are converted at the rate from their own dates, and your original amounts are kept."
      />
    </>
  );
}
