# SpendTogether — build plan

The complete, sequenced, testable build plan for SpendTogether, traceable to
`docs/spec/SpendTogether_Web_App_Specification.pdf` v1.0.

**Start here, then read the phase you have been approved to work on — and only that one.**
Standing rules for every session are in `/CLAUDE.md`.

## How this plan is organised

```
docs/plans/
├─ README.md                     ← you are here: index, phase order, status
├─ 00-shared/
│  ├─ architecture-decisions.md  ADR log (ADR-001…ADR-008)
│  ├─ repo-structure.md          target monorepo tree, purpose of every package
│  ├─ conventions.md             naming, branching, commits, style, error handling
│  ├─ tooling-and-skills.md      skills, MCP servers, packages — versions verified
│  ├─ traceability-matrix.md     every FR / WAC / T → phase → test
│  ├─ risk-register.md           R-01…R-15 with mitigations and owner phases
│  └─ open-questions.md          Q1…Q12 — assumptions in force, decisions needed
├─ frontend/
│  ├─ 00-overview.md             goals, principles, phase map, definition of done
│  ├─ ux-ui-specification.md     screens, components, microcopy, keyboard, a11y, money
│  ├─ F0…F13                     one file per phase
│  └─ frontend-acceptance.md     checklist to declare the frontend complete
└─ backend/
   ├─ 00-overview.md
   ├─ B0…B11                     one file per phase
   └─ backend-acceptance.md      checklist to declare the MVP complete
```

There is no `pdf/` directory: the owner chose Markdown-only plans (ADR-008).

## The strategy in three sentences

The API contract is frozen early (F1) as Zod schemas. The entire frontend is then built
against an MSW mock backend that enforces the **real** business rules — couple privacy,
idempotency, conversion at the record's date, goal completion and reversal — so it is
genuinely finished before any database exists. The backend is then written to satisfy that
same contract, with its contract tests consuming the **same fixtures** the mocks use, so
the two implementations cannot drift (ADR-002).

## Phase order and status

Work one phase at a time, in order, only after approval. Update this table at the end of
every phase.

### Frontend — 76 days

| Phase | Name | Depends on | Est. | Uncertainty | Status |
|---|---|---|:-:|:-:|---|
| F0 | Foundation | — | 3 d | Medium | Not started |
| F1 | Contract freeze (`packages/schemas`) | F0 | 4 d | Low | Not started |
| F2 | Domain package (`packages/domain`) | F0, F1 | 6 d | Medium | Not started |
| F3 | Design system | F0, F2 | 9 d | **High** | Not started |
| F4 | MSW mock backend | F1, F2 | 6 d | Medium | Not started |
| F5 | App shell and navigation | F3, F4 | 4 d | Medium | Not started |
| F6 | Auth and onboarding UI | F3, F4, F5 | 4 d | Low | Not started |
| F7 | Transactions | F3, F4, F5 | 7 d | Medium | Not started |
| F8 | Home dashboard and Insights | F3, F4, F7 | 7 d | Medium | Not started |
| F9 | Goals and contributions | F2, F3, F4, F5 | 6 d | Low | Not started |
| F10 | Couple and invitations | F3, F4, F5, F9 | 4 d | Low | Not started |
| F11 | Profile and settings | F3, F4, F5, F8 | 4 d | Low | Not started |
| F12 | PWA and offline | F5, F7, F9, F11 | 5 d | **High** | Not started |
| F13 | Hardening and frontend acceptance | F0–F12 | 7 d | **High** | Not started |

### Backend — 65 days

| Phase | Name | Depends on | Est. | Uncertainty | Status |
|---|---|---|:-:|:-:|---|
| B0 | Supabase foundation | F13 | 3 d | Medium | Not started |
| B1 | Schema, migrations and seed | B0 | 5 d | Low | Not started |
| B2 | RLS policies and pgTAP | B1 | 6 d | **High** | Not started |
| B3 | Views, functions and triggers | B1, B2 | 5 d | Medium | Not started |
| B4 | Auth | B1–B3 | 5 d | Medium | Not started |
| B5 | API layer and contract tests | B1–B4 | 10 d | Medium | Not started |
| B6 | Multi-currency | B1, B3, B5 | 6 d | **High** | Not started |
| B7 | Jobs and notifications | B4, B5, B6 | 4 d | Low | Not started |
| B8 | Integration — mocks to live | B5, B6, B7 | 7 d | **High** | Not started |
| B9 | Security and observability | B8 | 5 d | Medium | Not started |
| B10 | Deployment | B9 | 5 d (7 if VPS) | Medium | Not started |
| B11 | Launch readiness | B0–B10 | 4 d | Low | Not started |

**Total: 141 working days** — roughly 28 working weeks, or a little under seven months,
for one experienced engineer at a sustainable pace, including the tests each phase owes.
Two engineers cannot simply halve it: the backend cannot start before F1 freezes the
contract, although B0–B3 could run alongside F5 onward once it has.

### Where the estimates are least certain

Five phases carry roughly ±30% rather than ±15%:

- **F3 Design system** — 23 components × every variant × the full state matrix. The
  largest frontend phase, and the easiest to underestimate.
- **F12 PWA and offline** — an outbox state machine with retries, backoff and permanent
  rejection, across browsers with different Background Sync support.
- **F13 Hardening** — 22 screens × 5 widths × 4+ states, plus a manual assistive-technology
  pass on real devices.
- **B2 RLS policies** — around 160 four-role assertions. The privacy guarantee lives here,
  so the test volume is the point, not overhead.
- **B6 Multi-currency** and **B8 Integration** — both depend on things outside our control:
  an external rate provider, and how well the contract discipline actually held.

## Before starting F0 — decisions needed

Twelve open questions are recorded in `00-shared/open-questions.md`. Nine carry a stated
assumption the plan is already built on and can be overturned cheaply; three want an answer
before their phase.

**The two worth answering first**, because fixtures, seeds and screenshots all bake them
in, are **Q4** (the seed currency list — never enumerated in the spec) and **Q5** (the 14
default categories — also never enumerated). Both have provisional lists in
`open-questions.md`. Q5 is high confidence: nine expense categories map exactly onto the
nine `cat-*` colour tokens in §17.3, and five income categories bring the total to the 14
that wireframe W-09 shows.

## The rules that do not change

From `/CLAUDE.md`, repeated because they are the ones that matter:

- Money is integer minor units. No floats. Rates use `decimal.js`.
- Every formula lives in `packages/domain`, which stays pure.
- `packages/schemas` is the contract; changing it after F1 requires an ADR.
- The service-role key is never client-side.
- Components use tokens only; colour never carries meaning alone; WCAG 2.2 AA is part of
  done.
- Do not add scope. Everything in spec §26 is excluded on purpose. New ideas go to
  `open-questions.md`.
- **Never copy a number from the design boards.** Use the corrected reference dataset in
  spec §6.5. The Home hero is $330.00, not $850.

## Progress log

| Date | Phase | What changed |
|---|---|---|
| 2026-09-18 | Step 0 | Sources committed to `docs/spec/`; 61-page digest and design-board notes written |
| 2026-09-18 | Gate B | Full plan written: `CLAUDE.md`, 7 shared documents, 14 frontend phases, 12 backend phases, UX/UI specification, both acceptance checklists |
