import { z } from 'zod';
import { IsoTimestamp, Uuid } from './primitives';
import { InvitationStatus } from './couple';

// Public invitation landing (spec §10.4, SCR-20). Unauthenticated, so it returns the
// inviter's first name and nothing else about either person (plus the invitation id the
// link already identifies, ADR-013).

export const InvitationTokenParams = z.strictObject({ token: z.string().min(1) });

export const PublicInvitation = z.strictObject({
  /**
   * ADR-013: the invitation's id, so the invitee can call accept/decline
   * (`/couple/invitations/:id/…` with the token). Holding the link already grants this.
   */
  invitation_id: Uuid,
  inviter_first_name: z.string(),
  status: InvitationStatus,
  expires_at: IsoTimestamp,
});
export type PublicInvitation = z.infer<typeof PublicInvitation>;
