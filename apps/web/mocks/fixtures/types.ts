// Seed shapes: the public interface of the fixtures (ADR-002). They describe inputs as a
// person would enter them (amount, currency, date); the store converts and derives the
// rest with packages/domain, exactly as the real API will. B5 seeds its database from
// the same objects so the mock and the backend are checked against one dataset.

export type UserKey = string;

export interface SeedUser {
  key: UserKey;
  name: string;
  email: string | null;
  phone: string | null;
  password: string;
  baseCurrency: string;
  timezone: string;
  onboardedAt: string | null;
  createdAt: string;
}

export interface SeedCategory {
  key: string;
  /** null for the 14 system defaults. */
  owner: UserKey | null;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  archivedAt?: string | null;
}

export interface SeedCurrency {
  code: string;
  name: string;
  symbol: string;
  exponent: number;
  isActive: boolean;
}

/** One stored daily rate set: 1 USD = rate QUOTE (§9.3 exchange_rates). */
export interface SeedRates {
  rateDate: string;
  fetchedAt: string;
  rates: Record<string, string>;
}

export interface SeedTransaction {
  key: string;
  owner: UserKey;
  type: 'income' | 'expense';
  amountMinor: number;
  currency: string;
  category: string;
  date: string;
  note?: string;
}

export interface SeedGoal {
  key: string;
  owner: UserKey;
  type: 'individual' | 'couple';
  /** Required for couple goals. */
  couple?: string;
  name: string;
  icon: string;
  currency: string;
  targetMinor: number;
  targetDate: string;
  createdAt: string;
}

export interface SeedContribution {
  key: string;
  goal: string;
  contributor: UserKey;
  amountMinor: number;
  currency: string;
  date: string;
  note?: string;
}

export interface SeedCouple {
  key: string;
  members: [UserKey, UserKey];
  since: string;
  endedAt?: string | null;
}

export interface SeedInvitation {
  key: string;
  inviter: UserKey;
  invitee: string;
  inviteeKind: 'email' | 'phone';
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface Seed {
  /** Who the mock session is signed in as, or null for signed out. */
  session: UserKey | null;
  users: SeedUser[];
  categories: SeedCategory[];
  currencies: SeedCurrency[];
  rates: SeedRates[];
  transactions: SeedTransaction[];
  goals: SeedGoal[];
  contributions: SeedContribution[];
  couples: SeedCouple[];
  invitations: SeedInvitation[];
}
