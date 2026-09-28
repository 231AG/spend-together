import { ChartColumn, House, ListOrdered, Target, UserRound, type LucideIcon } from 'lucide-react';

// The five destinations (§12.2, correction #6). Every navigation treatment reads this
// list, so they can never disagree.

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/activity', label: 'Activity', icon: ListOrdered },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/insights', label: 'Insights', icon: ChartColumn },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

/** A destination is current for its own path and anything below it (e.g. /goals/123). */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
