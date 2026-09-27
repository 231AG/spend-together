# Spec example payloads

Verbatim copies of the three JSON examples in the specification, asserted in
`../spec-examples.test.ts`. Where the PDF abbreviates, the smallest edit that makes the
payload valid JSON was made. Every edit is listed here, and nothing else was changed.

| File | Source | Edits |
|---|---|---|
| `spec-10-2-error.json` | §10.2 | Removed the `// stable, machine-readable` comment (not valid JSON). |
| `spec-10-5-goal-detail.json` | §10.5 | The id `"6b1e…"` is truncated in the PDF; completed to a full UUID beginning `6b1e`. |
| `spec-16-3-insights-monthly.json` | §16.3 | `categories` ends in `, …`: filled with the five §6.5 / C-01 rows (Bills, Food, Other, Transport, Shopping), with placeholder UUIDs for the elided `"…"` ids. `series.points` shows only April with `…` values: filled with April–September, where July–September are the C-03 figures and April–June are 0 because the reference account opened in July. |
