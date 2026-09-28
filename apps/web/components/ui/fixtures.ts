import type { MoneyDisplay } from '@/lib/format-money';

// Story and test data from the corrected reference dataset (spec §6.5, D-11). Never
// copy numbers from the design boards.

export const TODAY = '2026-09-17';
export const usd = (amountMinor: number): MoneyDisplay => ({
  amountMinor,
  currency: 'USD',
  exponent: 2,
});
export const lrd = (amountMinor: number): MoneyDisplay => ({
  amountMinor,
  currency: 'LRD',
  exponent: 2,
  symbol: 'L$',
});

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'LRD', name: 'Liberian Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'Pound Sterling' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'SLE', name: 'Sierra Leonean Leone' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
];

const id = (n: number) => `00000000-0000-4000-8000-00000000c0${String(n).padStart(2, '0')}`;

export const CATEGORIES = [
  { id: id(1), name: 'Food', icon: 'utensils', color: 'cat-food', type: 'expense' },
  { id: id(2), name: 'Bills', icon: 'receipt', color: 'cat-bills', type: 'expense' },
  { id: id(3), name: 'Transport', icon: 'bus', color: 'cat-transport', type: 'expense' },
  { id: id(4), name: 'Shopping', icon: 'shopping-bag', color: 'cat-shopping', type: 'expense' },
  { id: id(5), name: 'Health', icon: 'heart-pulse', color: 'cat-health', type: 'expense' },
  { id: id(6), name: 'Education', icon: 'graduation-cap', color: 'cat-education', type: 'expense' },
  {
    id: id(7),
    name: 'Entertainment',
    icon: 'clapperboard',
    color: 'cat-entertainment',
    type: 'expense',
  },
  { id: id(8), name: 'Family', icon: 'users', color: 'cat-family', type: 'expense' },
  { id: id(9), name: 'Other', icon: 'circle-dashed', color: 'cat-other', type: 'expense' },
  { id: id(10), name: 'Salary', icon: 'wallet', color: 'cat-bills', type: 'income' },
  { id: id(11), name: 'Business', icon: 'briefcase', color: 'cat-family', type: 'income' },
  { id: id(12), name: 'Gift', icon: 'gift', color: 'cat-health', type: 'income' },
  { id: id(13), name: 'Investment', icon: 'trending-up', color: 'cat-transport', type: 'income' },
  { id: id(14), name: 'Other', icon: 'circle-dashed', color: 'cat-other', type: 'income' },
] as const satisfies readonly {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}[];
