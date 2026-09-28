// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddSheetProvider } from '../add-sheet';
import { NAV_ITEMS, isCurrent } from './nav-items';
import { BottomTabBar, IconRail, Sidebar, initials } from './navigation';

// F5-03: the three navigation treatments list the same five destinations and mark the
// current one with aria-current (breakpoint visibility is CSS, asserted in e2e).

let pathname = '/goals/abc';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  return (
    <QueryClientProvider client={client}>
      <AddSheetProvider>{node}</AddSheetProvider>
    </QueryClientProvider>
  );
}

describe('navigation (F5-03)', () => {
  beforeEach(() => {
    pathname = '/goals/abc';
  });

  it('isCurrent matches a destination and its children only', () => {
    expect(isCurrent('/goals', '/goals')).toBe(true);
    expect(isCurrent('/goals/abc/contribute', '/goals')).toBe(true);
    expect(isCurrent('/goalsx', '/goals')).toBe(false);
    expect(isCurrent('/home', '/goals')).toBe(false);
  });

  it.each([
    ['bottom tab bar', BottomTabBar],
    ['icon rail', IconRail],
    ['sidebar', Sidebar],
  ])('%s: five destinations, Goals current, no axe violations', async (_name, Nav) => {
    const { container } = render(wrap(<Nav />));
    const nav = screen.getByRole('navigation', { name: 'Main' });
    // The destination list only (the brand mark also links home).
    const list = within(nav).getAllByRole('list')[0];
    if (!list) throw new Error('no destination list');
    const links = within(list).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(NAV_ITEMS.map((i) => i.href));
    const current = links.filter((l) => l.getAttribute('aria-current') === 'page');
    expect(current.map((l) => l.getAttribute('href'))).toEqual(['/goals']);
    for (const l of links) expect(l.textContent).toMatch(/\w/); // every link has a text name
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(
      result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  });

  it('the rail and sidebar carry the global Add', () => {
    render(
      wrap(
        <>
          <IconRail />
          <Sidebar />
        </>,
      ),
    );
    expect(screen.getByRole('button', { name: 'Add transaction or contribution' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDefined();
  });

  it('initials for the user card', () => {
    expect(initials('Alex Kamara')).toBe('AK');
    expect(initials('Sam')).toBe('S');
    expect(initials('  Mary Ann   Tweh ')).toBe('MT');
  });
});
