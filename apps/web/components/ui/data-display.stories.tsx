import type { Meta, StoryObj } from '@storybook/react';
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-react';
import { CategoryIcon } from './category-icon';
import { CATEGORIES, TODAY, lrd, usd } from './fixtures';
import { GoalCard } from './goal-card';
import { MetricCard } from './metric-card';
import { MoneyText } from './money-text';
import { ProgressBar } from './progress-bar';
import { StatusChip } from './status-chip';
import { TransactionRow } from './transaction-row';

const meta = { title: 'Data display/Components' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const food = { icon: 'utensils', color: 'cat-food' };

/** C-05/C-06 with the §6.5 September totals. Deltas carry an arrow and text, not only colour. */
export const Metrics: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      <MetricCard
        label="Income"
        icon={<ArrowDownLeft className="size-(--icon-sm) text-income" strokeWidth={2} />}
        value={{ kind: 'money', money: usd(120000) }}
        delta={{ value: 8.0001, unit: 'pct', comparedTo: 'vs Aug', increaseIs: 'good' }}
      />
      <MetricCard
        label="Expenses"
        icon={<ArrowUpRight className="size-(--icon-sm) text-expense" strokeWidth={2} />}
        value={{ kind: 'money', money: usd(57000) }}
        delta={{ value: -4.2017, unit: 'pct', comparedTo: 'vs Aug', increaseIs: 'bad' }}
      />
      <MetricCard
        label="Saved"
        icon={<PiggyBank className="size-(--icon-sm) text-saving" strokeWidth={2} />}
        value={{ kind: 'money', money: usd(30000) }}
        delta={{ value: 20, unit: 'pct', comparedTo: 'vs Aug', increaseIs: 'good' }}
      />
      <MetricCard
        label="Savings rate"
        value={{ kind: 'pct', value: 25 }}
        delta={{ value: 2.49998, unit: 'pts', comparedTo: 'vs Aug', increaseIs: 'good' }}
      />
    </div>
  ),
};

export const HeroMetric: Story = {
  render: () => (
    <MetricCard
      label="Remaining this month"
      emphasis="hero"
      value={{ kind: 'money', money: usd(33000) }}
    />
  ),
};

/** AC05: zero income shows N/A with the reason, never 0% or ∞. New: previous period was 0 (T-16). */
export const NotApplicableAndNew: Story = {
  render: () => (
    <div className="flex gap-8">
      <MetricCard label="Savings rate" value={{ kind: 'pct', value: null }} />
      <MetricCard
        label="Saved"
        value={{ kind: 'money', money: usd(5000) }}
        delta={{ value: null, unit: 'pct', comparedTo: 'vs Aug', increaseIs: 'good' }}
      />
      <MetricCard
        label="Expenses"
        value={{ kind: 'money', money: usd(57000) }}
        delta={{ value: 0.01, unit: 'pct', comparedTo: 'vs Aug', increaseIs: 'bad' }}
      />
    </div>
  ),
};

export const Transactions: Story = {
  render: () => (
    <div className="max-w-(--dialog-max) rounded-lg border border-border-default bg-bg-card p-2">
      <TransactionRow
        baseCurrency="USD"
        onPress={() => undefined}
        row={{
          kind: 'income',
          title: 'Salary',
          note: 'September salary',
          category: { icon: 'wallet', color: 'cat-bills' },
          amount: usd(120000),
          date: '2026-09-01',
        }}
      />
      <TransactionRow
        baseCurrency="USD"
        onPress={() => undefined}
        row={{
          kind: 'expense',
          title: 'Food',
          note: 'Lunch at Waterside market',
          category: food,
          amount: usd(1200),
          date: TODAY,
        }}
      />
      <TransactionRow
        baseCurrency="USD"
        onPress={() => undefined}
        row={{
          kind: 'expense',
          title: 'Transport',
          note: 'Taxi to Paynesville',
          category: { icon: 'bus', color: 'cat-transport' },
          amount: lrd(500000),
          base: usd(2640),
          date: '2026-09-15',
        }}
      />
      <TransactionRow
        baseCurrency="USD"
        onPress={() => undefined}
        row={{
          kind: 'expense',
          title: 'Bills',
          note: 'Electricity',
          category: { icon: 'receipt', color: 'cat-bills' },
          amount: lrd(850000),
          base: usd(4488),
          estimated: true,
          date: '2026-09-04',
        }}
      />
      <TransactionRow
        baseCurrency="USD"
        onPress={() => undefined}
        row={{
          kind: 'contribution',
          title: 'New Laptop',
          note: 'Weekly top-up',
          amount: usd(5000),
          date: '2026-09-15',
        }}
      />
      <TransactionRow
        baseCurrency="USD"
        onPress={() => undefined}
        row={{
          kind: 'contribution',
          title: 'Vacation',
          amount: usd(5000),
          date: '2026-09-10',
          byName: 'Sam',
        }}
      />
      <TransactionRow
        baseCurrency="USD"
        onPress={() => undefined}
        row={{
          kind: 'expense',
          title: 'Food',
          note: 'Groceries',
          category: food,
          amount: usd(3000),
          date: TODAY,
          pending: true,
        }}
      />
    </div>
  ),
};

export const Goals: Story = {
  render: () => (
    <div className="grid max-w-(--content-max) gap-4 md:grid-cols-2">
      <GoalCard
        href="#laptop"
        goal={{
          name: 'New Laptop',
          type: 'individual',
          saved: usd(60000),
          target: usd(120000),
          progressPct: 50,
          targetDate: '2026-12-31',
          status: 'on_track',
        }}
      />
      <GoalCard
        href="#vacation"
        goal={{
          name: 'Vacation',
          type: 'couple',
          saved: usd(80000),
          target: usd(200000),
          progressPct: 40,
          targetDate: '2026-12-31',
          status: 'at_risk',
        }}
      />
      <GoalCard
        href="#emergency"
        goal={{
          name: 'Emergency fund',
          type: 'individual',
          saved: usd(25000),
          target: usd(100000),
          progressPct: 25,
          targetDate: '2026-12-31',
          status: 'behind',
        }}
      />
      <GoalCard
        href="#phone"
        goal={{
          name: 'New phone',
          type: 'individual',
          saved: usd(40000),
          target: usd(60000),
          progressPct: 66.6667,
          targetDate: '2026-09-01',
          status: 'behind',
          overdue: true,
        }}
      />
      <GoalCard
        href="#bike"
        goal={{
          name: 'Bicycle',
          type: 'individual',
          saved: usd(30000),
          target: usd(30000),
          progressPct: 100,
          targetDate: '2026-10-31',
          status: 'completed',
        }}
      />
      <GoalCard
        compact
        href="#laptop"
        goal={{
          name: 'New Laptop',
          type: 'individual',
          saved: usd(60000),
          target: usd(120000),
          progressPct: 50,
          targetDate: '2026-12-31',
          status: 'on_track',
        }}
      />
    </div>
  ),
};

/** Status is icon + text, never colour alone (§17.2). */
export const Statuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusChip status="on_track" />
      <StatusChip status="at_risk" />
      <StatusChip status="behind" />
      <StatusChip status="behind" overdue />
      <StatusChip status="completed" />
    </div>
  ),
};

export const Progress: Story = {
  render: () => (
    <div className="flex max-w-(--dialog-max) flex-col gap-4">
      <ProgressBar value={0} label="Empty goal" />
      <ProgressBar
        value={50}
        label="New Laptop progress"
        valueText="50% saved, $600.00 of $1,200.00"
      />
      <ProgressBar value={100} label="Completed goal" />
      <ProgressBar value={40} label="Shared goal" tone="saving" />
    </div>
  ),
};

export const Money: Story = {
  render: () => (
    <div className="flex flex-col items-end gap-3">
      <MoneyText money={usd(120000)} kind="income" baseCurrency="USD" />
      <MoneyText money={usd(1200)} kind="expense" baseCurrency="USD" />
      <MoneyText money={usd(5000)} kind="saving" baseCurrency="USD" />
      <MoneyText money={lrd(500000)} kind="expense" baseCurrency="USD" base={usd(2640)} />
      <MoneyText money={lrd(500000)} kind="expense" baseCurrency="USD" base={usd(2640)} estimated />
      <MoneyText money={{ amountMinor: 1000, currency: 'JPY', exponent: 0 }} baseCurrency="USD" />
      <MoneyText money={{ amountMinor: 1234, currency: 'KWD', exponent: 3 }} baseCurrency="USD" />
      <div className="w-24">
        <MoneyText money={usd(9_007_199_254_740)} baseCurrency="USD" />
      </div>
    </div>
  ),
};

export const CategoryIcons: Story = {
  render: () => (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CATEGORIES.map((c) => (
        <li key={c.id} className="flex items-center gap-2 type-body-sm text-fg-default">
          <CategoryIcon icon={c.icon} color={c.color} />
          {c.name}
          <span className="type-caption text-fg-muted">({c.type})</span>
        </li>
      ))}
    </ul>
  ),
};
