import { CircleDashed, Utensils } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_VISUALS, categoryVisual } from './category-visuals';

describe('category visuals (F3-15)', () => {
  it('every default category resolves to an icon and a §17.3 token', () => {
    const all = [
      ...Object.values(DEFAULT_CATEGORY_VISUALS.expense),
      ...Object.values(DEFAULT_CATEGORY_VISUALS.income),
    ];
    expect(all).toHaveLength(14);
    for (const v of all) {
      expect(CATEGORY_ICONS[v.icon]).toBeDefined();
      expect(v.token).toMatch(/^cat-/);
    }
  });

  it('the nine expense categories use the nine colour tokens once each', () => {
    const tokens = Object.values(DEFAULT_CATEGORY_VISUALS.expense).map((v) => v.token);
    expect(new Set(tokens).size).toBe(9);
  });

  it('falls back to Other for unknown icons and colours', () => {
    expect(categoryVisual('utensils', 'cat-food')).toEqual({ icon: Utensils, token: 'cat-food' });
    expect(categoryVisual('rocket', '#ff0000')).toEqual({ icon: CircleDashed, token: 'cat-other' });
  });
});
