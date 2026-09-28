import { ComingInPhase } from '@/components/layout/page-header';

// The bodies of the Add and Contribute forms, shared by the intercepted dialog and the
// full page so both render the same thing. F7 and F9 replace them with the real forms.

export const ADD_TYPES = ['income', 'expense'] as const;
export type AddType = (typeof ADD_TYPES)[number];

export function isAddType(value: string): value is AddType {
  return (ADD_TYPES as readonly string[]).includes(value);
}

export const ADD_TITLES: Record<AddType, string> = {
  income: 'Add income',
  expense: 'Add expense',
};

export function TransactionFormPlaceholder({ type }: { type: AddType }) {
  return (
    <ComingInPhase
      phase="F7"
      what={`The ${type} form: amount in any currency with the live conversion, category, date and note (SCR-${type === 'income' ? '10' : '11'}).`}
    />
  );
}

export function ContributionFormPlaceholder() {
  return (
    <ComingInPhase
      phase="F9"
      what="The contribution form: amount, currency (defaults to the goal's), date and note (SCR-18)."
    />
  );
}
