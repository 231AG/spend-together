// @vitest-environment jsdom
import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import type { FunctionComponent } from 'react';
import { describe, expect, it } from 'vitest';

// F3-14: every story, run through axe. Serious and critical violations fail CI (WAC-19).
// jsdom has no layout, so colour contrast is proven by the token contrast test instead.

type StoryModule = Parameters<typeof composeStories>[0];
const modules = import.meta.glob('./*.stories.tsx', { eager: true }) as unknown as Record<
  string,
  StoryModule
>;

describe.each(Object.entries(modules))('%s', (_file, module) => {
  // tsc infers unknown story values for a module typed by its generic bound, while the
  // ESLint project service infers components; the assertion satisfies both.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const stories = Object.entries(composeStories(module)) as [string, FunctionComponent][];
  it.each(stories)('%s has no serious or critical axe violations', async (_name, Story) => {
    const { container } = render(<Story />);
    const result = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const blocking = result.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      blocking.map(
        (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
      ),
    ).toEqual([]);
  });
});
