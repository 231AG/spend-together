import { goalBalance, localDate, sumMinor } from '@spendtogether/domain';
import { mockClock } from './clock';
import { ApiFailure, invalid, notFound } from './errors';
import type { Seed, SeedCurrency } from './fixtures';
import { FxTable, type FxApplied } from './fx';
import { nextId, resetIds, uid } from './ids';

// The mock's in-memory store (F4-01). Its integrity lives here, not in the handlers:
//  - goal balances are derived from contributions on every read (BR-08); goals have no
//    balance field;
//  - completion is recomputed on every contribution or target change, both ways (BR-11);
//  - every amount is converted at its own date's rate when written (BR-14, §11.2);
//  - access checks return NOT_FOUND for anything the caller may not see (BR-05).

export interface UserRecord {
  id: string;
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  password: string;
  baseCurrency: string;
  timezone: string;
  notifyEmail: { invite_accepted: boolean; goal_completed: boolean };
  onboardedAt: string | null;
  createdAt: string;
}

export interface CategoryRecord {
  id: string;
  ownerId: string | null;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault: boolean;
  archivedAt: string | null;
}

export interface TransactionRecord {
  id: string;
  ownerId: string;
  type: 'income' | 'expense';
  amountMinor: number;
  currency: string;
  baseAmountMinor: number;
  baseCurrency: string;
  fx: FxApplied;
  categoryId: string;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  seq: number;
}

export interface GoalRecord {
  id: string;
  ownerId: string;
  coupleId: string | null;
  type: 'individual' | 'couple';
  name: string;
  icon: string;
  currency: string;
  targetMinor: number;
  targetDate: string;
  /** Creation date in the creator's time zone (F-18, F-19). */
  createdDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  seq: number;
}

export interface ContributionRecord {
  id: string;
  goalId: string;
  contributorId: string;
  amountMinor: number;
  currency: string;
  /** Converted to the goal currency (§11.2). */
  goalAmountMinor: number;
  goalFx: FxApplied;
  /** Converted to the contributor's base currency (F-03). */
  baseAmountMinor: number;
  baseCurrency: string;
  baseFx: FxApplied;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  seq: number;
}

export interface CoupleRecord {
  id: string;
  memberIds: [string, string];
  since: string;
  endedAt: string | null;
}

export interface InvitationRecord {
  id: string;
  inviterId: string;
  invitee: string;
  inviteeKind: 'email' | 'phone';
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  createdAt: string;
  expiresAt: string;
}

interface Replay {
  at: number;
  status: number;
  body: unknown;
}

/** F-19 thresholds as seeded in app_config (§6.4). */
export const STATUS_THRESHOLDS = { onTrackMin: 0.95, atRiskMin: 0.75 };

const IDEMPOTENCY_WINDOW_MS = 48 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

export class MockDb {
  users: UserRecord[] = [];
  categories: CategoryRecord[] = [];
  currencies: SeedCurrency[] = [];
  transactions: TransactionRecord[] = [];
  goals: GoalRecord[] = [];
  contributions: ContributionRecord[] = [];
  couples: CoupleRecord[] = [];
  invitations: InvitationRecord[] = [];
  fx = new FxTable([]);
  rateFetchedAt = new Map<string, string>();
  sessionUserId: string | null = null;
  /** Users whose base-currency recalculation is in progress (§11.3). */
  recalculating = new Set<string>();
  private replays = new Map<string, Replay>();
  private loginFailures = new Map<string, number[]>();
  private seq = 0;

  // ------------------------------------------------------------------ seeding

  load(seed: Seed): void {
    resetIds();
    this.seq = 0;
    this.replays.clear();
    this.loginFailures.clear();
    this.recalculating.clear();
    this.currencies = seed.currencies.map((c) => ({ ...c }));
    this.fx = new FxTable(seed.rates);
    this.rateFetchedAt = new Map(seed.rates.map((r) => [r.rateDate, r.fetchedAt]));
    this.users = seed.users.map((u) => ({
      id: uid(`user:${u.key}`),
      key: u.key,
      name: u.name,
      email: u.email,
      phone: u.phone,
      password: u.password,
      baseCurrency: u.baseCurrency,
      timezone: u.timezone,
      notifyEmail: { invite_accepted: true, goal_completed: true },
      onboardedAt: u.onboardedAt,
      createdAt: u.createdAt,
    }));
    const userId = (key: string) => uid(`user:${key}`);
    this.categories = seed.categories.map((c) => ({
      id: uid(`category:${c.key}`),
      ownerId: c.owner === null ? null : userId(c.owner),
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isDefault: c.owner === null,
      archivedAt: c.archivedAt ?? null,
    }));
    this.couples = seed.couples.map((c) => ({
      id: uid(`couple:${c.key}`),
      memberIds: [userId(c.members[0]), userId(c.members[1])],
      since: c.since,
      endedAt: c.endedAt ?? null,
    }));
    this.invitations = seed.invitations.map((i) => ({
      id: uid(`invitation:${i.key}`),
      inviterId: userId(i.inviter),
      invitee: i.invitee,
      inviteeKind: i.inviteeKind,
      token: i.token,
      status: i.status,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    }));
    this.transactions = [];
    for (const t of seed.transactions) {
      const at = `${t.date}T10:00:00.000Z`;
      this.transactions.push(
        this.buildTransaction(userId(t.owner), uid(`tx:${t.key}`), {
          type: t.type,
          amountMinor: t.amountMinor,
          currency: t.currency,
          categoryId: uid(`category:${t.category}`),
          date: t.date,
          note: t.note ?? null,
          createdAt: at,
        }),
      );
    }
    this.goals = seed.goals.map((g) => {
      const owner = this.user(userId(g.owner));
      const couple = g.couple
        ? this.couples.find((c) => c.id === uid(`couple:${g.couple ?? ''}`))
        : undefined;
      return {
        id: uid(`goal:${g.key}`),
        ownerId: owner.id,
        coupleId: couple?.id ?? null,
        type: g.type,
        name: g.name,
        icon: g.icon,
        currency: g.currency,
        targetMinor: g.targetMinor,
        targetDate: g.targetDate,
        createdDate: localDate(new Date(g.createdAt), owner.timezone),
        createdAt: g.createdAt,
        updatedAt: g.createdAt,
        completedAt: null,
        archivedAt: couple?.endedAt ?? null,
        seq: this.nextSeq(),
      };
    });
    this.contributions = [];
    for (const c of seed.contributions) {
      const at = `${c.date}T11:00:00.000Z`;
      this.contributions.push(
        this.buildContribution(
          uid(`goal:${c.goal}`),
          userId(c.contributor),
          uid(`contribution:${c.key}`),
          {
            amountMinor: c.amountMinor,
            currency: c.currency,
            date: c.date,
            note: c.note ?? null,
            createdAt: at,
          },
        ),
      );
    }
    // Completion as of history: the contribution that crossed the target completed it.
    for (const goal of this.goals) {
      const history = this.contributionsOf(goal.id).sort((a, b) => a.seq - b.seq);
      history.forEach((c, i) => {
        const running = sumMinor(history.slice(0, i + 1).map((x) => x.goalAmountMinor));
        if (running >= goal.targetMinor && goal.completedAt === null)
          goal.completedAt = c.createdAt;
      });
    }
    this.sessionUserId = seed.session === null ? null : userId(seed.session);
  }

  nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  nowIso(): string {
    return mockClock.now().toISOString();
  }

  todayFor(user: UserRecord): string {
    return localDate(mockClock.now(), user.timezone);
  }

  // ------------------------------------------------------------------ lookups

  user(id: string): UserRecord {
    const u = this.users.find((x) => x.id === id);
    if (!u) throw notFound('That account');
    return u;
  }

  currency(code: string): SeedCurrency {
    const c = this.currencies.find((x) => x.code === code && x.isActive);
    if (!c) throw invalid('currency', `${code} is not a supported currency.`);
    return c;
  }

  /** The active couple the user belongs to, if any (BR-06: at most one). */
  activeCoupleOf(userId: string): CoupleRecord | undefined {
    return this.couples.find((c) => c.endedAt === null && c.memberIds.includes(userId));
  }

  partnerId(couple: CoupleRecord, userId: string): string {
    const other = couple.memberIds.find((m) => m !== userId);
    if (other === undefined) throw new ApiFailure('INTERNAL', 'Something went wrong on our side.');
    return other;
  }

  contributionsOf(goalId: string): ContributionRecord[] {
    return this.contributions.filter((c) => c.goalId === goalId);
  }

  /** A goal the user may see: their own individual goal, or a goal of any couple they were in. */
  visibleGoal(userId: string, goalId: string): GoalRecord {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal || !this.canSeeGoal(userId, goal)) throw notFound('That goal');
    return goal;
  }

  canSeeGoal(userId: string, goal: GoalRecord): boolean {
    if (goal.type === 'individual') return goal.ownerId === userId;
    const couple = this.couples.find((c) => c.id === goal.coupleId);
    return couple?.memberIds.includes(userId) ?? false;
  }

  /** A goal the user may change: visible and not archived (BR-18). */
  writableGoal(userId: string, goalId: string): GoalRecord {
    const goal = this.visibleGoal(userId, goalId);
    if (goal.archivedAt !== null) {
      throw new ApiFailure(
        'GOAL_ARCHIVED',
        'This shared goal is read-only because the couple has ended.',
      );
    }
    return goal;
  }

  ownTransaction(userId: string, id: string, includeDeleted = false): TransactionRecord {
    const t = this.transactions.find((x) => x.id === id && x.ownerId === userId);
    if (!t || (!includeDeleted && t.deletedAt !== null)) throw notFound('That transaction');
    return t;
  }

  /** Categories the user may pick: defaults plus their own, never another user's. */
  usableCategory(userId: string, id: string, type: 'income' | 'expense'): CategoryRecord {
    const c = this.categories.find(
      (x) => x.id === id && (x.ownerId === null || x.ownerId === userId),
    );
    if (!c) throw invalid('category_id', 'Choose a category.');
    if (c.type !== type) throw invalid('category_id', `Choose an ${type} category.`);
    if (c.archivedAt !== null)
      throw invalid('category_id', 'This category is archived. Choose another.');
    return c;
  }

  // ------------------------------------------------------------------ writes with rules

  convertOrFail(
    field: string,
    amountMinor: number,
    from: string,
    to: string,
    date: string,
  ): { amountMinor: number; fx: FxApplied } {
    const result = this.fx.convert({
      amountMinor,
      from: this.currency(from),
      to: this.currency(to),
      date,
    });
    if (result.ok) return result;
    if (result.reason === 'unavailable') {
      throw new ApiFailure(
        'FX_UNAVAILABLE',
        'Exchange rates are unavailable right now. Try again soon.',
      );
    }
    // ADR-005: rounding below one minor unit is rejected, never stored as zero.
    throw invalid(field, `This amount is too small to record in ${to}. Enter a larger amount.`);
  }

  buildTransaction(
    ownerId: string,
    id: string,
    input: {
      type: 'income' | 'expense';
      amountMinor: number;
      currency: string;
      categoryId: string;
      date: string;
      note: string | null;
      createdAt: string;
    },
  ): TransactionRecord {
    const owner = this.user(ownerId);
    const base = this.convertOrFail(
      'amount_minor',
      input.amountMinor,
      input.currency,
      owner.baseCurrency,
      input.date,
    );
    return {
      id,
      ownerId,
      type: input.type,
      amountMinor: input.amountMinor,
      currency: input.currency,
      baseAmountMinor: base.amountMinor,
      baseCurrency: owner.baseCurrency,
      fx: base.fx,
      categoryId: input.categoryId,
      date: input.date,
      note: input.note,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      deletedAt: null,
      seq: this.nextSeq(),
    };
  }

  buildContribution(
    goalId: string,
    contributorId: string,
    id: string,
    input: {
      amountMinor: number;
      currency: string;
      date: string;
      note: string | null;
      createdAt: string;
    },
  ): ContributionRecord {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal) throw notFound('That goal');
    const contributor = this.user(contributorId);
    const toGoal = this.convertOrFail(
      'amount_minor',
      input.amountMinor,
      input.currency,
      goal.currency,
      input.date,
    );
    const toBase = this.convertOrFail(
      'amount_minor',
      input.amountMinor,
      input.currency,
      contributor.baseCurrency,
      input.date,
    );
    return {
      id,
      goalId,
      contributorId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      goalAmountMinor: toGoal.amountMinor,
      goalFx: toGoal.fx,
      baseAmountMinor: toBase.amountMinor,
      baseCurrency: contributor.baseCurrency,
      baseFx: toBase.fx,
      date: input.date,
      note: input.note,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      seq: this.nextSeq(),
    };
  }

  /** BR-11: completed when balance ≥ target, and back to active when it drops below. */
  recomputeCompletion(goal: GoalRecord): void {
    const balance = goalBalance(
      this.contributionsOf(goal.id).map((c) => ({
        date: c.date,
        contributorId: c.contributorId,
        goalAmountMinor: c.goalAmountMinor,
      })),
    );
    if (balance >= goal.targetMinor) goal.completedAt ??= this.nowIso();
    else goal.completedAt = null;
  }

  /** §11.3: re-express every own record in the new base, at each record's own date. */
  recalculateBase(user: UserRecord): void {
    for (const t of this.transactions.filter((x) => x.ownerId === user.id)) {
      const base = this.convertOrFail(
        'base_currency',
        t.amountMinor,
        t.currency,
        user.baseCurrency,
        t.date,
      );
      t.baseAmountMinor = base.amountMinor;
      t.baseCurrency = user.baseCurrency;
      t.fx = base.fx;
    }
    for (const c of this.contributions.filter((x) => x.contributorId === user.id)) {
      const base = this.convertOrFail(
        'base_currency',
        c.amountMinor,
        c.currency,
        user.baseCurrency,
        c.date,
      );
      c.baseAmountMinor = base.amountMinor;
      c.baseCurrency = user.baseCurrency;
      c.baseFx = base.fx;
    }
  }

  // ------------------------------------------------------------------ idempotency, rate limits

  replay(scope: string, key: string | null): Replay | undefined {
    if (key === null) return undefined;
    const hit = this.replays.get(`${scope}:${key}`);
    if (!hit) return undefined;
    if (mockClock.now().getTime() - hit.at > IDEMPOTENCY_WINDOW_MS) {
      this.replays.delete(`${scope}:${key}`);
      return undefined;
    }
    return hit;
  }

  remember(scope: string, key: string | null, status: number, body: unknown): void {
    if (key === null) return;
    this.replays.set(`${scope}:${key}`, { at: mockClock.now().getTime(), status, body });
  }

  /** FR-01 / SCR-05: five failures in 15 minutes locks the identifier with Retry-After. */
  assertLoginAllowed(identifier: string): void {
    const now = mockClock.now().getTime();
    const recent = (this.loginFailures.get(identifier) ?? []).filter(
      (t) => now - t < LOGIN_WINDOW_MS,
    );
    this.loginFailures.set(identifier, recent);
    const oldest = recent[0];
    if (recent.length >= LOGIN_MAX_FAILURES && oldest !== undefined) {
      const retryAfter = Math.ceil((LOGIN_WINDOW_MS - (now - oldest)) / 1000);
      throw new ApiFailure('RATE_LIMITED', 'Too many attempts. Wait a few minutes and try again.', {
        headers: { 'Retry-After': String(retryAfter) },
      });
    }
  }

  recordLoginFailure(identifier: string): void {
    const list = this.loginFailures.get(identifier) ?? [];
    list.push(mockClock.now().getTime());
    this.loginFailures.set(identifier, list);
  }

  clearLoginFailures(identifier: string): void {
    this.loginFailures.delete(identifier);
  }

  newId(kind: string): string {
    return nextId(kind);
  }
}

/** The one store every handler shares: browser worker, Node server, Storybook. */
export const db = new MockDb();
