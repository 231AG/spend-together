# docs/spec — source material

The original source files are committed here. They are the authority; the
Markdown files beside them are working extractions.

| File | What it is | Status |
|---|---|---|
| `SpendTogether_Web_App_Specification.pdf` | The specification, v1.0, 17 Sep 2026, 61 pages. **The single source of truth.** | Original, committed |
| `design-board-1.png` | Design board 1 — "Mobile App Design Specification" | Original, committed |
| `design-board-2.png` | Design board 2 — "Mobile App Design Specifications" | Original, committed |
| `SpendTogether_Claude_Code_Planning_Prompt.pdf` | The build-planning brief this plan was produced under | Original, committed |
| `spec-digest.md` | Faithful Markdown extraction of all 61 pages, organised by the spec's own section numbers | Derived |
| `design-boards.md` | Description of both boards + the binding correction warning | Derived |

## How to use these

- **Search `spec-digest.md`, not the PDF.** It reproduces every FR-, BR-, F-,
  SCR-, WAC-, T- and C- ID, every formula, every table, the full SQL DDL, the
  API catalogue, the error codes and the design tokens. Load only the sections
  the current phase references.
- **If the digest and the PDF ever disagree, the PDF wins** and the digest is
  corrected in the same commit.
- **Never take a number, colour or typeface from the design boards.** Read
  `design-boards.md` first — the spec's "Source Corrections & Resolved
  Conflicts" (p.6) overrides the boards, and every mockup value in this project
  must come from the corrected reference dataset (spec §6.5).
