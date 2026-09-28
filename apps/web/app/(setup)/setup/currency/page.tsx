import { ComingInPhase } from '@/components/layout/page-header';

// SCR-07 Base currency and time zone `/setup/currency`.
export default function SetupCurrencyPage() {
  return (
    <>
      <h1 className="type-h1">Choose your currency</h1>
      <ComingInPhase
        phase="F6"
        what="Pick the currency your totals are shown in (pre-selected from your browser) and confirm your time zone."
      />
    </>
  );
}
