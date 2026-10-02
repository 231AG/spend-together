// The bodies of the Add and Contribute forms, shared by the intercepted dialog and the
// full page so both render the same thing. F9 replaces the contribution one; the transaction form is F7's.

export const ADD_TYPES = ['income', 'expense'] as const;
export type AddType = (typeof ADD_TYPES)[number];

export function isAddType(value: string): value is AddType {
  return (ADD_TYPES as readonly string[]).includes(value);
}

export const ADD_TITLES: Record<AddType, string> = {
  income: 'Add income',
  expense: 'Add expense',
};
