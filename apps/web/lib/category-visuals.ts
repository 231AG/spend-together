import {
  BriefcaseBusiness,
  CircleDashed,
  Clapperboard,
  Gift,
  GraduationCap,
  HeartPulse,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Bus,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

// F3-15: default categories (open-questions Q5, owner-confirmed) bound to a §17.3 colour
// token and a Lucide icon. Category is always icon + label, never icon alone (§18.2).

export type CategoryToken =
  | 'cat-food'
  | 'cat-bills'
  | 'cat-transport'
  | 'cat-shopping'
  | 'cat-health'
  | 'cat-education'
  | 'cat-entertainment'
  | 'cat-family'
  | 'cat-other';

export interface CategoryVisual {
  token: CategoryToken;
  icon: LucideIcon;
}

/** Keyed by the API's icon name (the `icon` field of a category). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  receipt: Receipt,
  bus: Bus,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  clapperboard: Clapperboard,
  users: Users,
  'circle-dashed': CircleDashed,
  wallet: Wallet,
  briefcase: BriefcaseBusiness,
  gift: Gift,
  'trending-up': TrendingUp,
};

/** The fourteen defaults, by type and name (Q5). */
export const DEFAULT_CATEGORY_VISUALS: Record<
  'expense' | 'income',
  Record<string, { token: CategoryToken; icon: string }>
> = {
  expense: {
    Food: { token: 'cat-food', icon: 'utensils' },
    Bills: { token: 'cat-bills', icon: 'receipt' },
    Transport: { token: 'cat-transport', icon: 'bus' },
    Shopping: { token: 'cat-shopping', icon: 'shopping-bag' },
    Health: { token: 'cat-health', icon: 'heart-pulse' },
    Education: { token: 'cat-education', icon: 'graduation-cap' },
    Entertainment: { token: 'cat-entertainment', icon: 'clapperboard' },
    Family: { token: 'cat-family', icon: 'users' },
    Other: { token: 'cat-other', icon: 'circle-dashed' },
  },
  income: {
    Salary: { token: 'cat-bills', icon: 'wallet' },
    Business: { token: 'cat-family', icon: 'briefcase' },
    Gift: { token: 'cat-health', icon: 'gift' },
    Investment: { token: 'cat-transport', icon: 'trending-up' },
    Other: { token: 'cat-other', icon: 'circle-dashed' },
  },
};

const TOKENS = new Set<string>([
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

/**
 * Resolve an API category (`icon`, `color`) to a visual. Unknown icons and colours fall
 * back to the "Other" visual rather than failing (user-created categories, §9).
 */
export function categoryVisual(icon: string, color: string): CategoryVisual {
  return {
    icon: CATEGORY_ICONS[icon] ?? CircleDashed,
    token: TOKENS.has(color) ? (color as CategoryToken) : 'cat-other',
  };
}
