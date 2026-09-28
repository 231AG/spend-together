import { describe, expect, it } from 'vitest';
import { endpoints, errorCodesFor, type Endpoint } from '../src/endpoints';
import { NoContent } from '../src/primitives';

const all = Object.values(endpoints) as Endpoint[];
const routes = new Set(all.map((e) => `${e.method} ${e.path}`));

// Transcribed from spec §10.3 and §10.4 (docs/spec/spec-digest.md), plus ADR-003 and ADR-012.
const SPEC_10_3 = [
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/logout',
  'POST /auth/refresh',
  'GET /transactions',
  'POST /transactions',
  'GET /transactions/:id',
  'PATCH /transactions/:id',
  'DELETE /transactions/:id',
  'GET /insights/daily',
  'GET /insights/weekly',
  'GET /insights/monthly',
  'GET /goals',
  'POST /goals',
  'GET /goals/:id',
  'PATCH /goals/:id',
  'DELETE /goals/:id',
  'POST /goals/:id/contributions',
  'GET /goals/:id/contributions',
  'GET /couple',
  'POST /couple/invite',
  'POST /couple/invitations/:id/accept',
  'DELETE /couple',
];
const SPEC_10_4 = [
  'GET /me',
  'PATCH /me',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
  'POST /auth/verify',
  'GET /categories',
  'POST /categories',
  'PATCH /categories/:id',
  'GET /activity',
  'GET /home/summary',
  'GET /currencies',
  'GET /exchange-rates',
  'PATCH /goals/:id/contributions/:cid',
  'DELETE /goals/:id/contributions/:cid',
  'POST /couple/invitations/:id/cancel',
  'POST /couple/invitations/:id/resend',
  'POST /couple/invitations/:id/decline',
  'GET /invitations/by-token/:token',
];

describe('endpoint registry', () => {
  const ADRS = ['POST /transactions/:id/restore', 'POST /auth/verify/resend'];

  it.each([...SPEC_10_3, ...SPEC_10_4, ...ADRS])('includes %s', (route) => {
    expect(routes.has(route)).toBe(true);
  });

  it('has nothing beyond the spec, ADR-003 and ADR-012', () => {
    expect(all).toHaveLength(SPEC_10_3.length + SPEC_10_4.length + ADRS.length);
    expect(routes.size).toBe(all.length);
  });

  it('204 endpoints, and only they, return NoContent', () => {
    for (const e of all) expect(e.status === 204).toBe(e.response === NoContent);
  });

  it('path parameters and params schemas agree', () => {
    for (const e of all) expect(e.path.includes('/:')).toBe(e.params !== undefined);
  });

  it('only transaction and contribution creates are idempotent (§10.1)', () => {
    const idem = Object.entries(endpoints)
      .filter(([, e]) => e.idempotent)
      .map(([k]) => k);
    expect(idem.sort()).toEqual(['createContribution', 'createTransaction']);
  });

  it('WAC-08: goal create declares COUPLE_REQUIRED', () => {
    expect(errorCodesFor(endpoints.createGoal)).toContain('COUPLE_REQUIRED');
  });

  it('derives the implied error codes', () => {
    expect(errorCodesFor(endpoints.getTransaction).sort()).toEqual([
      'INTERNAL',
      'NOT_FOUND',
      'UNAUTHENTICATED',
    ]);
    expect(errorCodesFor(endpoints.getInvitationByToken)).not.toContain('UNAUTHENTICATED');
  });
});
