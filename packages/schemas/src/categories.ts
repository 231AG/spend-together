import { z } from 'zod';
import { IsoTimestamp, ListOf, Uuid } from './primitives';

// Categories (spec §9.3, BR-17, SCR-22). Default categories are system-owned and locked.

export const CategoryType = z.enum(['income', 'expense']);

/** A chart colour token key from §17.3, e.g. "cat-food". */
export const CategoryColor = z.enum([
  'cat-food',
  'cat-bills',
  'cat-transport',
  'cat-shopping',
  'cat-health',
  'cat-education',
  'cat-entertainment',
  'cat-family',
  'cat-other',
]);

export const Category = z.strictObject({
  id: Uuid,
  name: z.string(),
  type: CategoryType,
  /** Lucide icon key. */
  icon: z.string(),
  color: CategoryColor,
  is_default: z.boolean(),
  archived_at: IsoTimestamp.nullable(),
});
export type Category = z.infer<typeof Category>;

export const ListCategoriesQuery = z.strictObject({
  type: CategoryType.optional(),
  /** Archived categories are hidden from pickers but kept for history and settings. */
  include: z.literal('archived').optional(),
});
export const ListCategoriesResponse = ListOf(Category);

export const CreateCategoryRequest = z.strictObject({
  name: z.string().trim().min(1).max(40),
  type: CategoryType,
  icon: z.string().min(1),
  color: CategoryColor,
});

/** Custom categories only. `archived: true` hides it from pickers (BR-17); history keeps it. */
export const PatchCategoryRequest = z
  .strictObject({
    name: z.string().trim().min(1).max(40),
    icon: z.string().min(1),
    color: CategoryColor,
    archived: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Change at least one field.');
