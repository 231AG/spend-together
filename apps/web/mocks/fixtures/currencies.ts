import type { SeedCurrency, SeedRates } from './types';

// The 12 owner-confirmed currencies (open-questions Q4) and their USD-based rates. T-11
// (LRD 189.39), T-12 (JPY exponent 0, KWD exponent 3) and D-12's sample rates.

export const CURRENCIES: SeedCurrency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', exponent: 2, isActive: true },
  { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$', exponent: 2, isActive: true },
  { code: 'EUR', name: 'Euro', symbol: '€', exponent: 2, isActive: true },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', exponent: 2, isActive: true },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', exponent: 2, isActive: true },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', exponent: 2, isActive: true },
  { code: 'SLE', name: 'Sierra Leonean Leone', symbol: 'Le', exponent: 2, isActive: true },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', exponent: 2, isActive: true },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', exponent: 2, isActive: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', exponent: 2, isActive: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', exponent: 0, isActive: true },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', exponent: 3, isActive: true },
];

const BASE_RATES: Record<string, string> = {
  USD: '1',
  LRD: '189.39',
  EUR: '0.92',
  GBP: '0.79',
  NGN: '1550',
  GHS: '15.6',
  SLE: '22.7',
  KES: '129.2',
  ZAR: '18.1',
  CAD: '1.36',
  JPY: '148.2',
  KWD: '0.3065',
};

/**
 * Rates exist from launch (1 June 2026). Records dated earlier use the earliest set,
 * flagged estimated (F-24). A mid-September move in LRD shows rate locking (BR-14).
 */
export const RATES: SeedRates[] = [
  { rateDate: '2026-06-01', fetchedAt: '2026-06-01T00:05:00.000Z', rates: BASE_RATES },
  { rateDate: '2026-08-01', fetchedAt: '2026-08-01T00:05:00.000Z', rates: BASE_RATES },
  {
    rateDate: '2026-09-15',
    fetchedAt: '2026-09-15T00:05:00.000Z',
    rates: { ...BASE_RATES, LRD: '190.1' },
  },
];
