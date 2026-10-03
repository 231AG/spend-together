import { z } from 'zod';
import { Identifier } from './auth';
import { IsoTimestamp, Uuid } from './primitives';

// Couple state and invitations (spec §10.3, §10.4, §7.8, SCR-19, BR-05, BR-06, BR-18).
// Every object here is strict and none has a field for money, balances, transactions or
// individual goals, so the partner's finances cannot be expressed on the wire (BR-05).

export const InvitationStatus = z.enum(['pending', 'accepted', 'declined', 'cancelled', 'expired']);

/** An invitation as its inviter sees it. */
export const Invitation = z.strictObject({
  id: Uuid,
  /** Normalised email or E.164 phone the invitation was sent to. */
  invitee: z.string(),
  invitee_kind: z.enum(['email', 'phone']),
  status: InvitationStatus,
  expires_at: IsoTimestamp,
  created_at: IsoTimestamp,
});
export type Invitation = z.infer<typeof Invitation>;

/** The partner, by name only. */
export const Partner = z.strictObject({
  name: z.string(),
  since: IsoTimestamp,
});

/** `{status, partner:{name}, invitation?, shared_goal_count}` (§10.3). */
export const CoupleState = z.strictObject({
  status: z.enum(['none', 'pending', 'active', 'ended']),
  partner: Partner.nullable(),
  /**
   * The open invitation while pending. With status `none` or `ended`, the inviter's latest
   * invitation if it was declined or expired, so they can see that and resend (ADR-014);
   * otherwise null.
   */
  invitation: Invitation.nullable(),
  shared_goal_count: z.int().nonnegative(),
  ended_at: IsoTimestamp.nullable(),
});
export type CoupleState = z.infer<typeof CoupleState>;

export const InviteRequest = z.strictObject({ invitee: Identifier });

export const InvitationParams = z.strictObject({ id: Uuid });

/** Accepting or declining proves possession of the link token. */
export const InvitationTokenRequest = z.strictObject({ token: z.string().min(1) });
