import { mockClock } from '../clock';
import { db, type TransactionRecord, type UserRecord } from '../db';
import { ApiFailure, invalid } from '../errors';
import { route } from '../http';
import { page } from '../paging';
import { transaction } from '../serialize';

// Transactions (§10.3, ADR-003, BR-07, BR-09, BR-13, BR-14). Converted at the rate of the
// record's own date; edits that touch amount, currency or date re-convert; deletes are
// soft with a 5-second undo window (§7.4), restorable until purged.

const UNDO_MS = 5000;
const FUTURE_DATE = 'This date is in the future. Choose today or an earlier date.';

function assertNotFuture(user: UserRecord, field: string, date: string) {
  if (date > db.todayFor(user)) throw invalid(field, FUTURE_DATE);
}

function ownList(user: UserRecord): TransactionRecord[] {
  return db.transactions
    .filter((t) => t.ownerId === user.id && t.deletedAt === null)
    .sort((a, b) => (a.date === b.date ? b.seq - a.seq : a.date < b.date ? 1 : -1));
}

export const transactionHandlers = [
  route('listTransactions', ({ user, query }) => {
    const q = query.q?.toLowerCase();
    const items = ownList(user).filter((t) => {
      if (query.type && t.type !== query.type) return false;
      if (query.category_id && t.categoryId !== query.category_id) return false;
      if (query.from && t.date < query.from) return false;
      if (query.to && t.date > query.to) return false;
      if (query.currency && t.currency !== query.currency) return false;
      if (q) {
        const cat = db.categories.find((c) => c.id === t.categoryId)?.name ?? '';
        if (!`${t.note ?? ''} ${cat}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const result = page(items, query.limit, query.cursor);
    return {
      data: result.data.map((t) => transaction(db, t, user)),
      next_cursor: result.next_cursor,
    };
  }),

  route('createTransaction', ({ user, body }) => {
    assertNotFuture(user, 'transaction_date', body.transaction_date);
    db.usableCategory(user.id, body.category_id, body.type);
    if (body.id !== undefined) {
      const existing = db.transactions.find((t) => t.id === body.id);
      if (existing?.ownerId === user.id) return transaction(db, existing, user);
      if (existing) throw new ApiFailure('CONFLICT', 'That record already exists.');
    }
    const record = db.buildTransaction(user.id, body.id ?? db.newId('transaction'), {
      type: body.type,
      amountMinor: body.amount_minor,
      currency: body.currency,
      categoryId: body.category_id,
      date: body.transaction_date,
      note: body.note ?? null,
      createdAt: db.nowIso(),
    });
    db.transactions.push(record);
    return transaction(db, record, user);
  }),

  route('getTransaction', ({ user, params }) =>
    transaction(db, db.ownTransaction(user.id, params.id), user),
  ),

  route('patchTransaction', ({ user, params, body }) => {
    const t = db.ownTransaction(user.id, params.id);
    if (body.transaction_date !== undefined)
      assertNotFuture(user, 'transaction_date', body.transaction_date);
    const type = body.type ?? t.type;
    const categoryId = body.category_id ?? t.categoryId;
    if (body.category_id !== undefined || body.type !== undefined)
      db.usableCategory(user.id, categoryId, type);
    const reconvert =
      body.amount_minor !== undefined ||
      body.currency !== undefined ||
      body.transaction_date !== undefined;
    const next = reconvert
      ? db.buildTransaction(user.id, t.id, {
          type,
          amountMinor: body.amount_minor ?? t.amountMinor,
          currency: body.currency ?? t.currency,
          categoryId,
          date: body.transaction_date ?? t.date,
          note: t.note,
          createdAt: t.createdAt,
        })
      : null;
    if (next) {
      t.amountMinor = next.amountMinor;
      t.currency = next.currency;
      t.baseAmountMinor = next.baseAmountMinor;
      t.baseCurrency = next.baseCurrency;
      t.fx = next.fx;
      t.date = next.date;
    }
    t.type = type;
    t.categoryId = categoryId;
    if (body.note !== undefined) t.note = body.note === '' ? null : body.note;
    t.updatedAt = db.nowIso();
    return transaction(db, t, user);
  }),

  route('deleteTransaction', ({ user, params }) => {
    const t = db.ownTransaction(user.id, params.id);
    t.deletedAt = db.nowIso();
    return { undo_until: new Date(mockClock.now().getTime() + UNDO_MS).toISOString() };
  }),

  route('restoreTransaction', ({ user, params }) => {
    const t = db.ownTransaction(user.id, params.id, true);
    t.deletedAt = null;
    t.updatedAt = db.nowIso();
    return transaction(db, t, user);
  }),
];
