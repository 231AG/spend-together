import { mockClock } from '../clock';
import { db, type InvitationRecord, type UserRecord } from '../db';
import { ApiFailure, invalid, notFound } from '../errors';
import { route } from '../http';
import { coupleState, invitation } from '../serialize';

// Couple and invitations (§10.3, §10.4, §7.8, BR-05, BR-06, BR-18). Responses carry names
// and states only; no schema here has a field for money, so no partner finances can leak.

const INVITE_DAYS = 7;

function pendingOf(user: UserRecord): InvitationRecord | undefined {
  return db.invitations.find(
    (i) => i.inviterId === user.id && invitation(db, i).status === 'pending',
  );
}

function ownInvitation(user: UserRecord, id: string): InvitationRecord {
  const i = db.invitations.find((x) => x.id === id && x.inviterId === user.id);
  if (!i) throw notFound('That invitation');
  return i;
}

/** The invitee proves possession of the link token; a wrong token is simply not found. */
function invitationByToken(id: string, token: string): InvitationRecord {
  const i = db.invitations.find((x) => x.id === id && x.token === token);
  if (!i) throw notFound('That invitation');
  return i;
}

function assertOpen(i: InvitationRecord) {
  if (invitation(db, i).status !== 'pending') {
    throw new ApiFailure('CONFLICT', 'This invitation is no longer open.');
  }
}

function matchesUser(invitee: string, user: UserRecord): boolean {
  return invitee.toLowerCase() === user.email?.toLowerCase() || invitee === user.phone;
}

export const coupleHandlers = [
  route('getCouple', ({ user }) => coupleState(db, user)),

  route('invitePartner', ({ user, body }) => {
    // BR-06: at most one active or pending couple.
    if (db.activeCoupleOf(user.id) || pendingOf(user)) {
      throw new ApiFailure('CONFLICT', 'You already have a partner or an open invitation.');
    }
    if (matchesUser(body.invitee, user)) throw invalid('invitee', "You can't invite yourself.");
    const now = mockClock.now();
    const record: InvitationRecord = {
      id: db.newId('invitation'),
      inviterId: user.id,
      invitee: body.invitee.includes('@') ? body.invitee.toLowerCase() : body.invitee,
      inviteeKind: body.invitee.includes('@') ? 'email' : 'phone',
      token: `invite-${String(db.nextSeq())}`,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString(),
    };
    db.invitations.push(record);
    return invitation(db, record);
  }),

  route('acceptInvitation', ({ user, params, body }) => {
    const i = invitationByToken(params.id, body.token);
    assertOpen(i);
    if (i.inviterId === user.id)
      throw new ApiFailure('CONFLICT', "You can't accept your own invitation.");
    if (db.activeCoupleOf(user.id) || db.activeCoupleOf(i.inviterId) || pendingOf(user)) {
      throw new ApiFailure('CONFLICT', 'One of you is already connected to a partner.');
    }
    i.status = 'accepted';
    db.couples.push({
      id: db.newId('couple'),
      memberIds: [i.inviterId, user.id],
      since: db.nowIso(),
      endedAt: null,
    });
    return coupleState(db, user);
  }),

  route('cancelInvitation', ({ user, params }) => {
    const i = ownInvitation(user, params.id);
    assertOpen(i);
    i.status = 'cancelled';
    return invitation(db, i);
  }),

  route('resendInvitation', ({ user, params }) => {
    const i = ownInvitation(user, params.id);
    assertOpen(i);
    i.expiresAt = new Date(mockClock.now().getTime() + INVITE_DAYS * 86_400_000).toISOString();
    return invitation(db, i);
  }),

  route('declineInvitation', ({ params, body }) => {
    const i = invitationByToken(params.id, body.token);
    assertOpen(i);
    i.status = 'declined';
    return invitation(db, i);
  }),

  // BR-18: couple goals become read-only for both; history stays; nothing else moves.
  route('endCouple', ({ user }) => {
    const couple = db.activeCoupleOf(user.id);
    if (!couple) throw new ApiFailure('CONFLICT', "You aren't connected to a partner.");
    const now = db.nowIso();
    couple.endedAt = now;
    for (const g of db.goals.filter((x) => x.coupleId === couple.id)) g.archivedAt = now;
    return coupleState(db, user);
  }),

  // Public landing: the inviter's first name and nothing else (SCR-20).
  route('getInvitationByToken', ({ params }) => {
    const i = db.invitations.find((x) => x.token === params.token);
    if (!i) throw notFound('That invitation');
    const inviter = db.user(i.inviterId);
    const wire = invitation(db, i);
    return {
      inviter_first_name: inviter.name.split(' ')[0] ?? inviter.name,
      status: wire.status,
      expires_at: wire.expires_at,
    };
  }),
];
