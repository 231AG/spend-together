import { CurrencySetup } from '@/components/features/auth/currency-setup';

// SCR-07 Currency setup `/setup/currency` (FR-05).
export default function SetupCurrencyPage() {
  return (
    <>
      <h1 className="type-h1">Choose your currency</h1>
      <CurrencySetup />
    </>
  );
}
