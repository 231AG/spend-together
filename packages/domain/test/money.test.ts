import { describe, expect, it } from 'vitest';
import { Decimal, minor, parseMajor, roundHalfAwayFromZero, sumMinor, toMajorString } from '../src';

describe('money primitives (F2-01, §6.1)', () => {
  it('decimal.js is configured for money: 40 digits, ties away from zero', () => {
    expect(Decimal.precision).toBe(40);
    expect(Decimal.rounding).toBe(Decimal.ROUND_HALF_UP);
  });

  it.each([
    ['2.5', 3],
    ['-2.5', -3],
    ['2.4999', 2],
    ['-2.4999', -2],
    ['0.5', 1],
    ['-0.5', -1],
    ['1.5', 2],
    ['-1.5', -2],
    ['0', 0],
  ])('rounds %s half away from zero to %i', (input, expected) => {
    expect(roundHalfAwayFromZero(input)).toBe(expected);
  });

  it('never yields negative zero', () => {
    expect(Object.is(roundHalfAwayFromZero('-0.4'), -0)).toBe(false);
  });

  it('minor() rejects fractions and unsafe integers', () => {
    expect(minor(42)).toBe(42);
    expect(() => minor(1.5)).toThrow(RangeError);
    expect(() => minor(2 ** 53)).toThrow(RangeError);
  });

  it('sums already-rounded amounts', () => {
    expect(sumMinor([])).toBe(0);
    expect(sumMinor([100, -30, 5])).toBe(75);
  });

  it.each([
    ['1000', 0, 1000, '1000'],
    ['12.5', 2, 1250, '12.50'],
    ['1.234', 3, 1234, '1.234'],
    ['0.01', 2, 1, '0.01'],
  ])('round-trips %s at exponent %i', (input, exponent, amount, display) => {
    expect(parseMajor(input, exponent)).toBe(amount);
    expect(toMajorString(amount, exponent)).toBe(display);
  });

  it.each([
    ['1.5', 0],
    ['1.234', 2],
    ['1,000', 2],
    ['-5', 2],
    ['1e3', 2],
    ['', 2],
    ['.5', 2],
  ])('parseMajor rejects %s at exponent %i', (input, exponent) => {
    expect(parseMajor(input, exponent)).toBeNull();
  });

  it('parseMajor trims whitespace', () => {
    expect(parseMajor(' 3.20 ', 2)).toBe(320);
  });

  it('multiplying two MoneyMinor values is a type error in intent, checked by lint', () => {
    // A branded number still multiplies at runtime; no-float-money and the helpers above
    // are the enforcement (decision log D-06). This asserts the brand exists at the type level.
    const a = minor(2);
    // @ts-expect-error a plain number is not MoneyMinor
    const b: ReturnType<typeof minor> = 3;
    expect(a + b).toBe(5);
  });
});
