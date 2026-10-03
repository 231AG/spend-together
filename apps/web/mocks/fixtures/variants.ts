import { ALEX, PASSWORD, SAM, referenceSeed } from './reference';
import type { Seed } from './types';

// Dataset variants behind the scenario switcher (F4-10, spec §19.2). Each is the
// reference dataset with one situation changed, so every other number stays known.

function withoutCouple(seed: Seed): Seed {
  const coupleGoals = new Set(seed.goals.filter((g) => g.type === 'couple').map((g) => g.key));
  return {
    ...seed,
    couples: [],
    invitations: [],
    goals: seed.goals.filter((g) => !coupleGoals.has(g.key)),
    contributions: seed.contributions.filter((c) => !coupleGoals.has(c.goal)),
  };
}

export const variants = {
  /** Alex, connected to Sam, the full §6.5 dataset. */
  reference: referenceSeed,

  /** A brand-new, onboarded user with no records and no partner. */
  empty: (): Seed => ({
    ...referenceSeed(),
    session: 'jordan',
    users: [
      ...referenceSeed().users,
      {
        key: 'jordan',
        name: 'Jordan Doe',
        email: 'jordan@example.com',
        phone: null,
        password: PASSWORD,
        baseCurrency: 'USD',
        timezone: 'Africa/Monrovia',
        onboardedAt: '2026-09-17T11:00:00.000Z',
        createdAt: '2026-09-17T10:55:00.000Z',
      },
    ],
  }),

  /** September without income: savings rate is N/A (AC05, T-02). */
  zeroIncome: (): Seed => {
    const seed = referenceSeed();
    return { ...seed, transactions: seed.transactions.filter((t) => t.key !== 'alex-sep-salary') };
  },

  /** No partner: the Couple screen's first state; couple goals cannot be created. */
  noPartner: (): Seed => withoutCouple(referenceSeed()),

  /** Invitation sent by Alex, not yet answered. */
  pendingInvite: (): Seed => ({
    ...withoutCouple(referenceSeed()),
    invitations: [
      {
        key: 'alex-pending',
        inviter: ALEX,
        invitee: 'sam.tweh@example.com',
        inviteeKind: 'email',
        token: 'invite-pending',
        status: 'pending',
        createdAt: '2026-09-16T18:00:00.000Z',
        expiresAt: '2026-09-23T18:00:00.000Z',
      },
    ],
  }),

  /** The couple ended yesterday: shared goals are archived and read-only (BR-18). */
  exPartner: (): Seed => {
    const seed = referenceSeed();
    return {
      ...seed,
      couples: seed.couples.map((c) => ({ ...c, endedAt: '2026-09-16T12:00:00.000Z' })),
    };
  },

  /** Sam's view: base currency LRD, foreign-currency goal contributions. */
  foreignCurrency: (): Seed => ({ ...referenceSeed(), session: SAM }),

  /** New Laptop is 20.00 short of its target, so one contribution completes it (BR-11). */
  goalAboutToComplete: (): Seed => {
    const seed = referenceSeed();
    return {
      ...seed,
      contributions: [
        ...seed.contributions,
        {
          key: 'laptop-6',
          goal: 'laptop',
          contributor: ALEX,
          amountMinor: 58000,
          currency: 'USD',
          date: '2026-09-16',
          note: 'Bonus',
        },
      ],
    };
  },

  /** Signed in but not onboarded: SCR-01 routes to currency setup (SCR-07). */
  notOnboarded: (): Seed => {
    const seed = variants.empty();
    return {
      ...seed,
      users: seed.users.map((u) => (u.key === 'jordan' ? { ...u, onboardedAt: null } : u)),
    };
  },

  /** Signed out, for the auth screens. */
  signedOut: (): Seed => ({ ...referenceSeed(), session: null }),

  /** Sam, signed in and unattached, opening Alex's pending invitation (§7.8, F10). */
  invitedPartner: (): Seed => ({ ...variants.pendingInvite(), session: SAM }),

  /** Alex's pending invitation, opened by someone who isn't signed in yet (SCR-20). */
  invitedSignedOut: (): Seed => ({ ...variants.pendingInvite(), session: null }),

  /**
   * Sam is already connected to Alex when Jordan's invitation arrives: Sam can't accept
   * (§7.8 "This person can't accept right now").
   */
  invitedWhileCoupled: (): Seed => {
    const seed = referenceSeed();
    const jordan = variants.empty().users.find((u) => u.key === 'jordan');
    if (!jordan) throw new Error('jordan fixture missing');
    return {
      ...seed,
      session: SAM,
      users: [...seed.users, jordan],
      invitations: [
        ...seed.invitations,
        {
          key: 'jordan-sam',
          inviter: 'jordan',
          invitee: 'sam.tweh@example.com',
          inviteeKind: 'email',
          token: 'invite-jordan',
          status: 'pending',
          createdAt: '2026-09-16T18:00:00.000Z',
          expiresAt: '2026-09-23T18:00:00.000Z',
        },
      ],
    };
  },

  /** Alex's invitation was declined; Alex sees "Declined" (§7.8, ADR-014). */
  inviteDeclined: (): Seed => {
    const seed = variants.pendingInvite();
    return {
      ...seed,
      invitations: seed.invitations.map((i) => ({ ...i, status: 'declined' as const })),
    };
  },

  /** Alex's invitation lapsed after 7 days; Resend is offered (§7.8). */
  inviteExpired: (): Seed => {
    const seed = variants.pendingInvite();
    return {
      ...seed,
      invitations: seed.invitations.map((i) => ({
        ...i,
        createdAt: '2026-09-08T18:00:00.000Z',
        expiresAt: '2026-09-15T18:00:00.000Z',
      })),
    };
  },
} satisfies Record<string, () => Seed>;

export type VariantName = keyof typeof variants;
