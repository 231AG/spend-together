import type { Meta, StoryObj } from '@storybook/react';
import { PiggyBank, Plus } from 'lucide-react';
import { Button } from './button';
import { ChartContainer } from './chart-container';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingSkeleton } from './loading-skeleton';
import { OfflineSyncIndicator } from './offline-sync-indicator';

const meta = { title: 'States/Components' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <EmptyState
      illustration={
        <span className="inline-grid size-(--avatar-lg) place-items-center rounded-full bg-bg-selected text-fg-link">
          <PiggyBank className="size-(--icon-lg)" strokeWidth={1.75} />
        </span>
      }
      title="You have no savings goals yet"
      body="A goal turns saving into a plan: you'll see how much to put aside each week to get there on time."
      action={
        <Button iconLeft={<Plus aria-hidden className="size-(--icon-md)" strokeWidth={1.75} />}>
          Create goal
        </Button>
      }
    />
  ),
};

export const EmptyFiltered: Story = {
  render: () => (
    <EmptyState
      title="No activity matches these filters"
      body="Try a wider date range or fewer categories."
      action={<Button variant="tertiary">Clear filters</Button>}
    />
  ),
};

/** Skeletons appear after 150 ms and stop shimmering under reduced motion. */
export const Loading: Story = {
  render: () => (
    <div className="grid gap-6 md:grid-cols-2">
      <LoadingSkeleton shape="hero" label="Loading your summary" />
      <LoadingSkeleton shape="row" count={3} label="Loading activity" />
      <LoadingSkeleton shape="goal-card" count={2} label="Loading goals" />
      <LoadingSkeleton shape="metric" count={2} />
    </div>
  ),
};

export const ErrorBlock: Story = {
  render: () => (
    <ErrorState
      message="We couldn't load your goals. Check your connection and try again."
      onRetry={() => undefined}
    />
  ),
};

/** Cached content stays visible under a non-blocking banner (§19.1). */
export const ErrorBanner: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <ErrorState
        variant="banner"
        message="Couldn't refresh. Showing what we had at 09:14."
        onRetry={() => undefined}
      />
      <p className="type-body-lg">…cached content remains here…</p>
    </div>
  ),
};

export const Chart: Story = {
  render: () => (
    <ChartContainer
      title="Where your money went"
      description="Expenses this month by category · USD"
      table={{
        caption: 'Expenses by category, September 2026',
        columns: ['Category', 'Amount', 'Share'],
        rows: [
          ['Bills', '$150.00', '26.3%'],
          ['Food', '$140.00', '24.6%'],
          ['Other', '$105.00', '18.4%'],
          ['Transport', '$90.00', '15.8%'],
          ['Shopping', '$85.00', '14.9%'],
        ],
      }}
    >
      <div className="grid h-40 place-items-center rounded-md bg-bg-subtle type-body-sm text-fg-body">
        Chart renders here (F8)
      </div>
    </ChartContainer>
  ),
};

export const SyncIndicator: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <OfflineSyncIndicator online={false} pendingCount={0} />
      <OfflineSyncIndicator online={false} pendingCount={2} />
      <OfflineSyncIndicator online pendingCount={1} />
      <OfflineSyncIndicator online pendingCount={0} attentionCount={1} />
    </div>
  ),
};
