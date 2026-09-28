import { describe, expect, it } from 'vitest';
import { safeNext, withNext } from './safe-next';

describe('safeNext (?next= is same-origin only, F5-02)', () => {
  it.each([
    ['/goals', '/goals'],
    ['/goals?tab=ours', '/goals?tab=ours'],
    ['/activity?q=food#x', '/activity?q=food#x'],
  ])('keeps the in-app path %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['goals'],
    ['//evil.example/phish'],
    ['/\\evil.example'],
    ['https://evil.example'],
    ['javascript:alert(1)'],
    ['/%2F%2Fevil.example'],
  ])('refuses %s and falls back to /home', (input) => {
    const result = safeNext(input);
    expect(result === '/home' || result.startsWith('/%2F')).toBe(true);
    expect(result.startsWith('//')).toBe(false);
  });

  it('uses the given fallback', () => {
    expect(safeNext('//x', '/setup/currency')).toBe('/setup/currency');
  });

  it('builds redirect targets', () => {
    expect(withNext('/', '/goals?tab=ours')).toBe('/?next=%2Fgoals%3Ftab%3Dours');
    expect(withNext('/', '/')).toBe('/');
  });
});
