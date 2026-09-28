import { z } from 'zod';
import { CurrencyCode, IsoTimestamp, Uuid } from './primitives';

// The signed-in user's own profile (spec §10.4, SCR-07, SCR-21).

export const NotifyEmail = z.strictObject({
  invite_accepted: z.boolean(),
  goal_completed: z.boolean(),
});

/** IANA time zone name, e.g. "Africa/Monrovia". */
export const TimeZone = z
  .string()
  .regex(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/, 'Expected an IANA time zone.');

export const Me = z.strictObject({
  id: Uuid,
  name: z.string(),
  email: z.email().nullable(),
  phone: z.string().nullable(),
  base_currency: CurrencyCode,
  timezone: TimeZone,
  notify_email: NotifyEmail,
  onboarded_at: IsoTimestamp.nullable(),
  /** True while a base-currency change is being recalculated (§11.3). */
  recalculating: z.boolean(),
});
export type Me = z.infer<typeof Me>;

/**
 * Changing `base_currency` starts the §11.3 recalculation. `onboarded: true` completes
 * currency setup (SCR-07).
 */
export const PatchMeRequest = z
  .strictObject({
    name: z.string().trim().min(1).max(80),
    base_currency: CurrencyCode,
    timezone: TimeZone,
    notify_email: NotifyEmail,
    onboarded: z.literal(true),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Change at least one field.');
