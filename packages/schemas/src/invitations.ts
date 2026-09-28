import { z } from 'zod';
import { IsoTimestamp } from './primitives';
import { InvitationStatus } from './couple';

// Public invitation landing (spec §10.4, SCR-20). Unauthenticated, so it returns the
// inviter's first name and nothing else about either person.

export const InvitationTokenParams = z.strictObject({ token: z.string().min(1) });

export const PublicInvitation = z.strictObject({
  inviter_first_name: z.string(),
  status: InvitationStatus,
  expires_at: IsoTimestamp,
});
export type PublicInvitation = z.infer<typeof PublicInvitation>;
