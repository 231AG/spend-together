// The corrected reference dataset (spec §6.5), the one canonical sample for the domain
// tests, F4's mock backend and later the backend contract tests. Never copy numbers from
// the design boards (docs/spec/design-boards.md). Base currency USD; amounts in cents.

import type { GoalContribution } from '../../src/goal';
import type { CashTransaction, SavingsContribution } from '../../src/summary';

/** The pinned clock: Thursday 17 September 2026 in the user's time zone. */
export const TODAY = '2026-09-17';
export const TIME_ZONE = 'Africa/Monrovia';
export const BASE_CURRENCY = 'USD';

export const USER = { id: '00000000-0000-4000-8000-00000000a001', name: 'Alex Kamara' };
export const PARTNER = { id: '00000000-0000-4000-8000-00000000a002', name: 'Sam Tweh' };

export const CATEGORY = {
  bills: '00000000-0000-4000-8000-00000000c001',
  food: '00000000-0000-4000-8000-00000000c002',
  other: '00000000-0000-4000-8000-00000000c003',
  transport: '00000000-0000-4000-8000-00000000c004',
  shopping: '00000000-0000-4000-8000-00000000c005',
  salary: '00000000-0000-4000-8000-00000000c006',
} as const;

const sep = (day: number) => `2026-09-${String(day).padStart(2, '0')}`;
const expense = (day: number, categoryId: string, baseAmountMinor: number): CashTransaction => ({
  type: 'expense',
  date: sep(day),
  categoryId,
  baseAmountMinor,
});

/** September to date: income 1,200.00, expenses 570.00. */
export const TRANSACTIONS: readonly CashTransaction[] = [
  { type: 'income', date: sep(1), categoryId: CATEGORY.salary, baseAmountMinor: 120000 },
  expense(2, CATEGORY.food, 2250),
  expense(3, CATEGORY.transport, 1500),
  expense(4, CATEGORY.bills, 4500),
  expense(5, CATEGORY.food, 1875),
  expense(6, CATEGORY.shopping, 4000),
  expense(7, CATEGORY.other, 3000),
  expense(8, CATEGORY.food, 2125),
  expense(8, CATEGORY.transport, 2000),
  expense(9, CATEGORY.bills, 3500),
  expense(10, CATEGORY.food, 2600),
  expense(11, CATEGORY.other, 4500),
  expense(12, CATEGORY.shopping, 4500),
  expense(12, CATEGORY.transport, 2500),
  expense(13, CATEGORY.food, 3000),
  expense(14, CATEGORY.bills, 7000),
  expense(15, CATEGORY.transport, 3000),
  expense(16, CATEGORY.other, 3000),
  expense(16, CATEGORY.food, 2150),
];

/** September contributions by the user, in base currency: 300.00 recorded savings. */
export const CONTRIBUTIONS: readonly SavingsContribution[] = [
  { date: sep(1), contributorId: USER.id, contributorBaseAmountMinor: 20000 },
  { date: sep(10), contributorId: USER.id, contributorBaseAmountMinor: 5000 },
  { date: sep(15), contributorId: USER.id, contributorBaseAmountMinor: 5000 },
];

/** The partner's contribution to the shared goal: never counts as the user's savings. */
export const PARTNER_CONTRIBUTIONS: readonly SavingsContribution[] = [
  { date: sep(10), contributorId: PARTNER.id, contributorBaseAmountMinor: 5000 },
];

/** August, the previous period, as totals only. */
export const AUGUST = { income: 111111, expenses: 59500, saved: 25000 };

/** Goal "New Laptop": target 1,200.00, balance 600.00, created 1 Jul, due 31 Dec. */
export const LAPTOP = {
  target: 120000,
  createdDate: '2026-07-01',
  targetDate: '2026-12-31',
  contributions: [
    { date: '2026-07-15', contributorId: USER.id, goalAmountMinor: 10000 },
    { date: '2026-08-01', contributorId: USER.id, goalAmountMinor: 10000 },
    { date: '2026-08-14', contributorId: USER.id, goalAmountMinor: 15000 },
    { date: '2026-09-01', contributorId: USER.id, goalAmountMinor: 20000 },
    { date: '2026-09-15', contributorId: USER.id, goalAmountMinor: 5000 },
  ] satisfies GoalContribution[],
};

/** Default F-19 thresholds as seeded in `app_config`. */
export const THRESHOLDS = { onTrackMin: 0.95, atRiskMin: 0.75 };
