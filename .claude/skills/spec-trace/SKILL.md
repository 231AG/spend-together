---
name: spec-trace
description: Keep docs/plans/00-shared/traceability-matrix.md true as part of every ticket's definition of done. Use when a ticket closes or changes coverage of an FR-, WAC- or T- ID, when writing tests that cover a spec ID, or when asked what covers a requirement.
---

# spec-trace

Every ticket names the FR-, WAC- or T- IDs it serves (CLAUDE.md). This skill keeps the
traceability matrix honest.

## When a ticket touches a spec ID

1. Put the ID in the test name, so it can be found by search:
   `it('T-06 required pace rounds once at full precision', ...)`.
2. Find the row in `docs/plans/00-shared/traceability-matrix.md` (search for the ID).
3. Fill in the test file path and set the status. Do not invent IDs; look them up in
   `docs/spec/spec-digest.md`.
4. Commit the matrix change in the same commit as the tests.

## Verify before calling a phase done

```bash
# Every ID the matrix marks covered must appear in at least one test name.
grep -oE '\b(T|WAC|FR)-[0-9]+' docs/plans/00-shared/traceability-matrix.md | sort -u > /tmp/matrix-ids
grep -rhoE '\b(T|WAC|FR)-[0-9]+' --include='*.test.ts' --include='*.test.tsx' --include='*.spec.ts' apps packages | sort -u > /tmp/test-ids
comm -23 /tmp/matrix-ids /tmp/test-ids   # IDs in the matrix with no test yet
```

The output is not automatically a failure (an ID may be scheduled for a later phase),
but every ID the matrix marks as covered in the current phase must be absent from it.

## Rules

- A requirement is covered by a test that asserts it, not by code that implements it.
- If you cannot name an ID for a ticket, ask whether the ticket is in scope (CLAUDE.md).
- The PDF wins over the digest. If they disagree, fix the digest in the same commit.
