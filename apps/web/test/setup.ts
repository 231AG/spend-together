import { afterEach } from 'vitest';

// React Testing Library cleans up automatically only with globals enabled; do it here.
afterEach(async () => {
  if (typeof document === 'undefined') return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});

// jsdom lacks matchMedia and ResizeObserver, which Radix and useMediaQuery use.
if (typeof window !== 'undefined') {
  const stubs = globalThis as Record<string, unknown>;
  if (typeof stubs['matchMedia'] !== 'function') {
    stubs['matchMedia'] = (query: string): Partial<MediaQueryList> => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
  }
  if (typeof stubs['ResizeObserver'] !== 'function') {
    stubs['ResizeObserver'] = class {
      observe = () => undefined;
      unobserve = () => undefined;
      disconnect = () => undefined;
    };
  }
}
