# F10 — Couple and invitations

## 1. Objective

Build the partner connection: the three couple states, the full invitation lifecycle
(send, pending, resend, cancel, decline, expire, accept), the public invitation landing
page, and ending a couple. The governing constraint is BR-05 — connecting as a couple
shares shared goals and nothing else — and this phase's real job is to make that
guarantee visible and legible to both users.

## 2. Spec references

SCR-19 (Couple), SCR-20 (invitation landing); §7.8 (invite and connect), §7.9 (end
couple); FR-19, FR-20, FR-21; BR-04, BR-05, BR-06, BR-18; §10.3 and §10.4 couple
endpoints; §19.2 (Couple row); W-07 wireframe; AC11, AC12.

## 3. Prerequisites

F3, F4 (couple handlers with the privacy sweep), F5 (public `/invite/[token]` route),
F9 (shared goals appear on the Connected state).

## 4. Deliverables

- `/couple` in all three states: no partner, pending, connected.
- Invitation actions: invite by email or phone, resend, cancel; and the invitee's accept
  or decline.
- `/invite/[token]` public landing page.
- End-connection flow with typed confirmation.
- Ex-partner (archived) state.

## 5. Task breakdown

**F10-01 · No-partner state (SCR-19)** — explanation of what a partner will and will not
see, plus Invite partner. *Files:* `app/(app)/couple/page.tsx`. *Acceptance:* reproduces
W-07's copy — "Your partner sees shared goals only. Your income, expenses and personal
goals always stay private." The privacy promise is on screen **before** the user invites
anyone, not after.

**F10-02 · Invite form** — email or phone with format auto-detection. *Files:*
`components/features/couple/invite-form.tsx`. *Acceptance:* **FR-19** — a valid
identifier creates a pending invitation; inviting oneself is rejected; an invitee who is
already in a couple produces "This person can't accept right now" (§7.8) without
revealing whether they have an account.

**F10-03 · Pending state** — destination, expiry date, Resend and Cancel; the "Shared
goals appear here after Sam accepts" hint. *Files:*
`components/features/couple/pending-card.tsx`. *Acceptance:* reproduces W-07's pending
card; Cancel invalidates immediately (§7.8); Resend is available and does not create a
second pending invitation.

**F10-04 · Connected state** — partner name, connected-since date, shared goals preview,
Create shared goal, End connection. *Files:*
`components/features/couple/connected-card.tsx`. *Acceptance:* **FR-20, WAC-12** —
**never** displays partner income, expenses, balances or individual goals; a test asserts
the rendered DOM contains no forbidden field even when the mock is coaxed into returning
one.

**F10-05 · Invitation landing (SCR-20)** — "Alex invited you to save together on
SpendTogether", the privacy explanation, then Accept/Decline if logged in, or Create
account / Log in if not, returning to accept afterwards. *Files:*
`app/invite/[token]/page.tsx`. *Acceptance:* **FR-19** — shows the inviter's **first name
only**; an invalid or expired token explains and suggests asking for a resend; an invitee
already in a couple is told they cannot accept, with the reason.

**F10-06 · Accept and decline** — accept calls the invitation accept endpoint; decline
sets the inviter's view to "Declined". *Files:* `hooks/use-invitation-actions.ts`.
*Acceptance:* accepting activates the couple and reveals Our Goals; declining shows
"Declined" to the inviter (§7.8).

**F10-07 · End couple (§7.9)** — End connection → consequences dialog → **type the
partner's first name to confirm** → couple ended, shared goals read-only. *Files:*
`components/features/couple/end-connection-dialog.tsx`. *Acceptance:* **FR-21, BR-18** —
the dialog states the consequences plainly; confirmation requires the typed name; after
ending, couple goals are read-only for **both** former partners and history remains
visible.

**F10-08 · Ex-partner state** — archived couple goals readable, no new contributions,
banner explaining why. *Files:* across couple and goal screens. *Acceptance:* a
contribution attempt yields `409 GOAL_ARCHIVED` rendered as plain language.

**F10-09 · States** — loading (status card skeleton), error (Retry), offline
(read-only — couple management is disabled offline per §19.1). *Files:* across.
*Acceptance:* every §19.2 Couple-row state renders; offline disables management with the
explanation "Connect to the internet to do this."

## 6. Tooling

No new packages. The `component-checklist` skill applies.

## 7. Testing

Component tests for each of the three states and for the end-connection confirmation
gate. A dedicated **privacy assertion test**: render every couple-context screen with a
mock deliberately returning extra partner fields, and fail if any reaches the DOM.
Playwright covers **flow 7.8** (invite → accept → connected, two browser contexts) and
**flow 7.9** (end couple), including the two-user couple scenario from §23.

Covers **FR-19, FR-20, FR-21**; **WAC-12** (both partners see couple-goal contributions
with contributor name; no other partner data visible). The API half of WAC-12 is proven
by RLS tests in B2.

## 8. Exit criteria

1. All three couple states render per W-07, with the privacy explanation present before
   inviting.
2. The full invitation lifecycle works: send, resend, cancel, decline, expire, accept.
3. The landing page shows only the inviter's first name and handles invalid, expired and
   already-coupled cases.
4. No partner financial data appears in any couple-context screen — asserted
   adversarially, not assumed.
5. Ending a couple requires the typed name, states its consequences, and leaves shared
   goals read-only with history intact for both parties.
6. Playwright flows 7.8 and 7.9 pass with two browser contexts.
7. axe clean across all states.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A partner's data leaks through a shared component reused from an individual context | The adversarial DOM test; the contract has no field for it (F1-06); RLS closes it for real in B2 |
| Invitation state machine has an unreachable or stuck state | All five statuses (pending/accepted/declined/cancelled/expired) have an explicit UI; the scenario switcher exposes each |
| Q6 (pending collision) resolved differently than assumed | The UI renders whatever status the contract returns; only copy changes if the resolution differs |
| The end-connection typed confirmation is annoying enough to be removed | It is specified (§7.9) and is the correct friction for an irreversible action |

## 10. Estimate

**4 days.** Roughly: 1.5 days the three states, 1 day the invitation lifecycle and
landing page, 1 day end-couple and ex-partner states, 0.5 day the privacy test and E2E.
Low uncertainty.

## 11. Approval gate

Owner reviews: the full invite-and-accept flow across two browser profiles; the connected
state showing shared goals and nothing else; the end-connection dialog; and the
ex-partner read-only state. Then F11 may start.
