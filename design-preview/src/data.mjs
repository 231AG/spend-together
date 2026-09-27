// Sample data for the preview. Totals reproduce the spec §6.5 corrected reference dataset
// exactly (pinned clock 2026-09-17, base currency USD). Nothing here is copied from the boards.
// All amounts are integer minor units.

export const TODAY = 'Thursday, 17 September 2026';

export const me = { name: 'Alex Kamara', first: 'Alex', initials: 'AK', email: 'alex.kamara@example.com' };
export const partner = { name: 'Sam Tweh', first: 'Sam', initials: 'ST', since: '2 June 2026' };

export const month = {
  income: 120000,
  expenses: 57000,
  saved: 30000,
  net: 63000, // F-05
  remaining: 33000, // F-04
  savingsRate: '25.0%', // F-06
  avgDaily: 3353, // F-07: 570.00 / 17
  prev: { income: 111111, expenses: 59500, saved: 25000, savingsRate: '22.5%' },
  change: { income: '+8.0%', expenses: '−4.2%', saved: '+20.0%', savingsRate: '+2.5 pts' },
};

// C-01, sorted by amount desc (F-08, F-09).
export const categories = [
  { name: 'Bills', icon: 'receipt', token: 'cat-bills', amount: 15000, pct: '26.3%' },
  { name: 'Food', icon: 'utensils', token: 'cat-food', amount: 14000, pct: '24.6%' },
  { name: 'Other', icon: 'circle-dashed', token: 'cat-other', amount: 10500, pct: '18.4%' },
  { name: 'Transport', icon: 'bus', token: 'cat-transport', amount: 9000, pct: '15.8%' },
  { name: 'Shopping', icon: 'shopping-bag', token: 'cat-shopping', amount: 8500, pct: '14.9%' },
];

const cat = Object.fromEntries(categories.map((c) => [c.name, c]));
cat.Salary = { name: 'Salary', icon: 'wallet', token: 'cat-bills' };

// September activity. Expenses sum to 57000, income 120000, contributions 30000.
export const transactions = [
  { day: 16, type: 'expense', cat: 'Food', note: 'Lunch at Waterside market', amount: 2150 },
  { day: 16, type: 'expense', cat: 'Other', note: 'Barber', amount: 3000 },
  { day: 15, type: 'saving', goal: 'New Laptop', note: 'Weekly top-up', amount: 5000 },
  { day: 15, type: 'expense', cat: 'Transport', note: 'Taxi to Paynesville', amount: 3000 },
  { day: 14, type: 'expense', cat: 'Bills', note: 'Water and phone', amount: 7000 },
  { day: 13, type: 'expense', cat: 'Food', note: 'Groceries', amount: 3000 },
  { day: 12, type: 'expense', cat: 'Shopping', note: 'School shoes', amount: 4500 },
  { day: 12, type: 'expense', cat: 'Transport', note: 'Fuel', amount: 2500 },
  { day: 11, type: 'expense', cat: 'Other', note: 'Church contribution', amount: 4500 },
  { day: 10, type: 'saving', goal: 'Vacation', note: 'Our trip to Robertsport', amount: 5000 },
  { day: 10, type: 'expense', cat: 'Food', note: 'Dinner with friends', amount: 2600 },
  { day: 9, type: 'expense', cat: 'Bills', note: 'Internet', amount: 3500 },
  { day: 8, type: 'expense', cat: 'Food', note: 'Groceries', amount: 2125 },
  { day: 8, type: 'expense', cat: 'Transport', note: 'Keke rides', amount: 2000 },
  { day: 7, type: 'expense', cat: 'Other', note: 'Gift for Mum', amount: 3000 },
  { day: 6, type: 'expense', cat: 'Shopping', note: 'Phone case', amount: 4000 },
  { day: 5, type: 'expense', cat: 'Food', note: 'Lunch', amount: 1875 },
  { day: 4, type: 'expense', cat: 'Bills', note: 'Electricity', amount: 4500 },
  { day: 3, type: 'expense', cat: 'Transport', note: 'Bus pass', amount: 1500 },
  { day: 2, type: 'expense', cat: 'Food', note: 'Market run', amount: 2250 },
  { day: 1, type: 'income', cat: 'Salary', note: 'September salary', amount: 120000 },
  { day: 1, type: 'saving', goal: 'New Laptop', note: 'Payday transfer', amount: 20000 },
].map((t) => ({ ...t, category: t.cat ? cat[t.cat] : null }));

// C-02 daily expense buckets, 1-17 Sep, derived from the list above.
export const daily = Array.from({ length: 17 }, (_, i) => {
  const day = i + 1;
  const value = transactions.filter((t) => t.type === 'expense' && t.day === day).reduce((s, t) => s + t.amount, 0);
  return { label: `${day} Sep`, value, tick: [1, 5, 9, 13, 17].includes(day) };
});

// C-03 (spec §16 specimen). The account opened in July, so three months exist.
export const monthly = [
  { label: 'Jul', income: 110000, expenses: 64000 },
  { label: 'Aug', income: 111111, expenses: 59500 },
  { label: 'Sep', income: 120000, expenses: 57000 },
];

export const goals = [
  {
    id: 'laptop', name: 'New Laptop', icon: 'laptop', type: 'Individual', saved: 60000, target: 120000, pct: 50,
    due: '31 Dec 2026', status: 'ontrack',
  },
  {
    id: 'emergency', name: 'Emergency fund', icon: 'shield-check', type: 'Individual', saved: 25000, target: 100000, pct: 25,
    due: '31 Dec 2026', status: 'behind',
  },
  {
    id: 'vacation', name: 'Vacation', icon: 'palmtree', type: 'Couple', saved: 80000, target: 200000, pct: 40,
    due: '31 Dec 2026', status: 'atrisk',
  },
];

export const status = {
  ontrack: { label: 'On track', icon: 'check' },
  atrisk: { label: 'At risk', icon: 'triangle-alert' },
  behind: { label: 'Behind', icon: 'arrow-down' },
  completed: { label: 'Completed', icon: 'star' },
};

// Goal details: New Laptop (spec §6.5). Contributions total 60000.
export const laptopDetail = {
  remaining: 60000,
  daysLeft: 105,
  pace: { day: 571, week: 4000, month: 17393 }, // F-15..F-17
  expected: 51148, // F-19, elapsed 78 of 183 days
  ratio: '1.17',
  currentPaceDaily: 833, // F-18: 25000 over the last 30 days / 30
  projected: '28 Nov 2026',
  history: [
    { date: '15 Sep 2026', note: 'Weekly top-up', amount: 5000 },
    { date: '1 Sep 2026', note: 'Payday transfer', amount: 20000 },
    { date: '14 Aug 2026', note: 'Side job', amount: 15000 },
    { date: '1 Aug 2026', note: 'Payday transfer', amount: 10000 },
    { date: '15 Jul 2026', note: 'First deposit', amount: 10000 },
  ],
};

// C-07 for the shared Vacation goal (F-21).
export const vacationSplit = { you: 48000, youPct: 60, partner: 32000, partnerPct: 40 };
