import { db } from '../db';
import { route } from '../http';
import { scenario } from '../scenarios';
import { me } from '../serialize';

// Profile (§10.4). A base-currency change re-expresses every own record at its own date's
// rate and reports `recalculating: true` for a while (§11.3, WAC-15); originals are kept.

export const meHandlers = [
  route('getMe', ({ user }) => {
    const out = me(db, user);
    return scenario().recalculating ? { ...out, recalculating: true } : out;
  }),

  route('patchMe', ({ user, body }) => {
    if (body.name !== undefined) user.name = body.name;
    if (body.timezone !== undefined) user.timezone = body.timezone;
    if (body.notify_email !== undefined) user.notifyEmail = { ...body.notify_email };
    if (body.onboarded === true) user.onboardedAt ??= db.nowIso();
    if (body.base_currency !== undefined && body.base_currency !== user.baseCurrency) {
      db.currency(body.base_currency);
      user.baseCurrency = body.base_currency;
      db.recalculateBase(user);
      const ms = scenario().recalcMs;
      if (ms > 0) {
        db.recalculating.add(user.id);
        setTimeout(() => {
          db.recalculating.delete(user.id);
        }, ms);
      }
    }
    return me(db, user);
  }),
];
