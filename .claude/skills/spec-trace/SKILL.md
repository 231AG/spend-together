---
name: spec-trace
description: Keep docs/plans/00-shared/traceability-matrix.md honest. Use when a ticket implements or tests any FR-, WAC-, T- or BR- identifier from the specification, when finishing a phase, or when asked whether a requirement is covered.
---

# Keeping traceability honest

Every ticket in this project names the specification identifiers it serves. If a
ticket cannot name one, that is the signal to ask whether it is in scope at all
(CLAUDE.md, "Trace as you go").

## When a ticket closes an identifier

1. Open `docs/plans/00-shared/traceability-matrix.md`.
2. Find the row for each FR-, WAC- or T- identifier the ticket implements or tests.
3. Fill in the **Test(s)** column with the real test file and name — not a plan,
   an actual path that exists.
4. Move **Status** to ☑ only when that test passes. ◐ while in progress.

A row is evidence, not intention. If the test does not exist yet, the row stays ☐.

## Tagging tests so the matrix can be verified mechanically

Domain test cases carry their identifier in the test name, so coverage can be
checked by grep rather than by reading:

```ts
it('T-01 totals: income 1,200, expenses 570, savings 300', () => {
  /* ... */
});
it('T-09 status thresholds at 0.95, 0.9499, 0.75, 0.7499', () => {
  /* ... */
});
```

Verify with:

```bash
pnpm test -- --reporter=json | grep -oE 'T-[0-9]{2}' | sort -u
```

## At the end of a phase

- Every identifier the phase's _Testing_ section claims must be ☑ with a real test.
- Anything the phase could not cover is reported explicitly in the phase summary,
  never quietly left ☐.
- Update the status table in `docs/plans/README.md` in the same commit.

## What not to do

- Do not mark a row ☑ because the code exists. The row tracks the _test_.
- Do not delete a row you cannot satisfy. Report it — an unplaced identifier is
  information, and the matrix says so explicitly at the bottom.
- Do not add identifiers the specification does not define.
