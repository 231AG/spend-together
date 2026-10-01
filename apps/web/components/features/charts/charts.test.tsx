// @vitest-environment jsdom
import type { HomeSummaryResponse } from '@spendtogether/schemas';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { donutSlices, money, seriesPoints } from '@/lib/insights';
import { SummaryHeroCard } from '../home/summary-hero-card';
import CategoryDonut from './category-donut';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chartMetrics, useChartMotion } from './chart-kit';
import IncomeExpenseChart from './income-expense-chart';
import SpendingTrendChart from './spending-trend-chart';
import { renderHook } from '@testing-library/react';

// F8: each chart's data-to-encoding mapping, its table equivalent, the minimum-data rule
// and reduced motion (§16.2); the hero card against §6.5. Values are asserted as rendered
// text, never snapshots, so a formatting change is caught rather than blessed.

vi.mock('next/navigation', () => ({
  usePathname: () => '/insights',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const usd = (minor: number) => money(minor, 'USD', { exponent: 2, symbol: '$' });
const REFERENCE = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Bills',
    amount: 15000,
    pct: 26.315789473684,
  },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Food', amount: 14000, pct: 24.561403508772 },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Other',
    amount: 10500,
    pct: 18.421052631579,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Transport',
    amount: 9000,
    pct: 15.789473684211,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'Shopping',
    amount: 8500,
    pct: 14.912280701754,
  },
];
const SERIES = seriesPoints({
  bucket: 'month',
  points: [
    { start: '2026-07-01', income: 110000, expenses: 64000 },
    { start: '2026-08-01', income: 111111, expenses: 59500 },
    { start: '2026-09-01', income: 120000, expenses: 57000 },
  ],
});

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') ? reduce : true,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function noSeriousViolations(container: HTMLElement) {
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(
    result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
}

describe('C-01 category donut', () => {
  it('lists every slice with amount and share, sorted, colours from cat-* tokens', async () => {
    const colors = ['cat-bills', 'cat-food', 'cat-other', 'cat-transport', 'cat-shopping'];
    const slices = donutSlices(
      REFERENCE,
      (id) => colors[REFERENCE.findIndex((c) => c.id === id)] ?? 'cat-other',
    );
    const { container } = render(
      <CategoryDonut
        slices={slices}
        total={57000}
        period={{ start: '2026-09-01', end: '2026-09-30' }}
        currency="USD"
        money={usd}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Bills: $150.00, 26.3%. Show these expenses',
      'Food: $140.00, 24.6%. Show these expenses',
      'Other: $105.00, 18.4%. Show these expenses',
      'Transport: $90.00, 15.8%. Show these expenses',
      'Shopping: $85.00, 14.9%. Show these expenses',
    ]);
    // Shares as shown add up to 100.0% (exit criterion 8).
    const shown = links.map((l) =>
      Number(/(\d+\.\d)%/.exec(l.getAttribute('aria-label') ?? '')?.[1]),
    );
    expect(shown.reduce((a, b) => a + b, 0).toFixed(1)).toBe('100.0');
    const swatches = container.querySelectorAll<HTMLElement>('li [aria-hidden].rounded-full');
    expect([...swatches].map((s) => s.style.background)).toEqual(colors.map((c) => `var(--${c})`));
    expect(screen.getByText('$570.00')).toBeTruthy();
    await noSeriousViolations(container);
  });

  it('toggles to a real table and hides the chart from assistive technology', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CategoryDonut
        slices={donutSlices(REFERENCE, () => 'cat-food')}
        total={57000}
        period={{ start: '2026-09-01', end: '2026-09-30' }}
        currency="USD"
        money={usd}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(within(table).getByRole('rowheader', { name: 'Bills' })).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"].hidden')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View as chart' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await noSeriousViolations(container);
  });
});

describe('C-02 / C-03 trends', () => {
  it('labels the average per bucket and offers the same data as a table', async () => {
    const user = userEvent.setup();
    render(<SpendingTrendChart points={SERIES} bucket="month" currency="USD" money={usd} />);
    expect(screen.getByText('avg $601.67/month')).toBeTruthy();
    expect(screen.getByText('Expenses, last 6 months · USD')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.map((r) => r.textContent)).toEqual([
      'PeriodSpending',
      'July 2026$640.00',
      'August 2026$595.00',
      'September 2026$570.00',
    ]);
  });

  it('shows income and expenses per period, with a legend naming both', async () => {
    setReducedMotion(false);
    const user = userEvent.setup();
    render(<IncomeExpenseChart points={SERIES} currency="USD" money={usd} />);
    expect(screen.getByText('Income')).toBeTruthy();
    expect(screen.getByText('Expenses')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'View as table' }));
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.map((r) => r.textContent)).toEqual([
      'PeriodIncomeExpenses',
      'July 2026$1,100.00$640.00',
      'August 2026$1,111.11$595.00',
      'September 2026$1,200.00$570.00',
    ]);
  });

  it('shows the minimum-data message instead of an empty axis', () => {
    const one = SERIES.map((p, i) => (i < 2 ? { ...p, income: 0, expenses: 0 } : p));
    render(<SpendingTrendChart points={one} bucket="month" currency="USD" money={usd} />);
    expect(screen.getByText('Your trends appear as you record more activity.')).toBeTruthy();
    expect(screen.getByText('September 2026: $570.00')).toBeTruthy();
  });
});

describe('§16.2 motion and tokens', () => {
  const tokens = readFileSync(
    path.resolve(import.meta.dirname, '../../../../../packages/config/tailwind/tokens.css'),
    'utf8',
  );

  it('the chart duration token is at most 300 ms and 0 under reduced motion', () => {
    const [base, reduced] = [...tokens.matchAll(/--dur-chart:\s*(\d+)ms/g)].map((m) =>
      Number(m[1]),
    );
    expect(base).toBeLessThanOrEqual(300);
    expect(reduced).toBe(0);
  });

  it('animates with the token, and not at all under reduced motion', () => {
    document.documentElement.style.setProperty('--dur-chart', '300ms');
    setReducedMotion(false);
    expect(renderHook(() => useChartMotion()).result.current).toEqual({
      isAnimationActive: true,
      animationDuration: 300,
    });
    setReducedMotion(true);
    expect(renderHook(() => useChartMotion()).result.current.isAnimationActive).toBe(false);
    document.documentElement.style.removeProperty('--dur-chart');
  });

  it('reads bar radius and tick size from tokens (rem resolved to px)', () => {
    document.documentElement.style.setProperty('--chart-bar-radius', '4px');
    document.documentElement.style.setProperty('--chart-tick-size', '0.75rem');
    document.documentElement.style.fontSize = '16px';
    expect(chartMetrics()).toEqual({ barRadius: [4, 4, 0, 0], tickSize: 12 });
  });
});

describe('Home hero card (F8-01, §6.5)', () => {
  const summary = {
    period: { type: 'monthly', start: '2026-09-01', end: '2026-09-30', days_elapsed: 17 },
    currency: 'USD',
    totals: {
      income: 120000,
      expenses: 57000,
      saved: 30000,
      net: 63000,
      remaining: 33000,
      savings_rate_pct: 25,
      avg_daily_spending: 3353,
    },
    categories: [],
    goals: [],
    recent: [],
  } as HomeSummaryResponse;

  it('leads with remaining cash flow, never the boards’ $850', () => {
    render(<SummaryHeroCard summary={summary} period="month" money={usd} />);
    const region = screen.getByRole('region', { name: 'Remaining this month · USD' });
    expect(region.textContent).toContain('$330.00');
    expect(region.textContent).toContain('Net cash flow $630.00 · after $300.00 saved');
    expect(region.textContent).toContain('25.0%');
    expect(region.textContent).not.toContain('850');
  });

  it('shows Overspent with a minus and an icon, and N/A without income', () => {
    render(
      <SummaryHeroCard
        summary={{
          ...summary,
          totals: {
            ...summary.totals,
            income: 0,
            remaining: -87000,
            net: -57000,
            savings_rate_pct: null,
          },
        }}
        period="week"
        money={usd}
      />,
    );
    const region = screen.getByRole('region', { name: 'Overspent this week · USD' });
    expect(region.textContent).toContain('−$870.00');
    expect(region.textContent).toContain('N/A');
    expect(region.textContent).not.toMatch(/NaN|Infinity/);
  });
});
