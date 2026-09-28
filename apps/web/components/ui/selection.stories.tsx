import type { Meta, StoryObj } from '@storybook/react';
import { Bell, Coins, Tags } from 'lucide-react';
import { useState } from 'react';
import { FilterChip } from './filter-chip';
import { PeriodSelector, SegmentedControl, type HomePeriod } from './segmented-control';
import { SelectRow } from './select-row';

const meta = { title: 'Selection/Controls' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Period: Story = {
  render: function Render() {
    const [value, setValue] = useState<HomePeriod>('month');
    return <PeriodSelector value={value} onValueChange={setValue} />;
  },
};

export const InsightsPeriod: Story = {
  render: function Render() {
    const [value, setValue] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    return (
      <SegmentedControl
        label="Insights period"
        value={value}
        onValueChange={setValue}
        options={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />
    );
  },
};

export const Chips: Story = {
  render: function Render() {
    const [selected, setSelected] = useState<string[]>(['Expenses']);
    const toggle = (label: string) => {
      setSelected((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));
    };
    return (
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter activity">
        {['Income', 'Expenses', 'Savings', 'Food', 'Bills'].map((label) => (
          <FilterChip
            key={label}
            label={label}
            selected={selected.includes(label)}
            onClick={() => {
              toggle(label);
            }}
          />
        ))}
      </div>
    );
  },
};

export const SettingsRows: Story = {
  render: () => (
    <div className="max-w-(--dialog-max) divide-y divide-border-default rounded-lg border border-border-default bg-bg-card">
      <SelectRow
        label="Base currency"
        value="USD"
        icon={<Coins className="size-(--icon-md)" strokeWidth={1.75} />}
        href="#currency"
      />
      <SelectRow
        label="Categories"
        value="14"
        icon={<Tags className="size-(--icon-md)" strokeWidth={1.75} />}
        href="#categories"
      />
      <SelectRow
        label="Notifications"
        icon={<Bell className="size-(--icon-md)" strokeWidth={1.75} />}
        onClick={() => undefined}
      />
    </div>
  ),
};
