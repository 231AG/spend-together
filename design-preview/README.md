# Design preview (pre-F0)

Static, high-fidelity preview of the key screens, built so the owner can sign off the
visual direction before F0 starts. **Throwaway:** F3 rebuilds these as real components
in `apps/web` and this folder is deleted then.

- **Tokens:** `src/styles.css` copies spec §17-18 verbatim. No hard-coded colours in components.
- **Numbers:** every figure reproduces the corrected reference dataset (spec §6.5, §16),
  pinned to 17 Sep 2026, base currency USD. Nothing is copied from the design boards.
- **Money:** integer minor units throughout (`src/data.mjs`), formatted once in `src/lib.mjs`.
- **Illustrations:** generated with Canva. The files in `assets/illustrations/` are
  low-resolution previews because this environment's network policy blocks canva.com.
  Replace them with full-size exports; nothing else changes.

| Screen | Spec |
|---|---|
| Welcome | SCR-02 |
| Log in (error state shown) | SCR-05 |
| Home | SCR-08 |
| Add sheet | SCR-09 |
| Add expense | SCR-11 |
| Activity (desktop split view) | SCR-12, SCR-13 |
| Insights | SCR-14, C-01, C-02, C-03, C-05, C-06 |
| Goals | SCR-15, C-04 |
| Goal details (New Laptop) | SCR-17, F-15..F-19 |
| Couple (connected) | SCR-19, C-07 |
| Profile | SCR-21 |

## Run

```
npm install
npm run build          # -> dist/*.html
npm run shoot          # -> screenshots/<screen>--{mobile,tablet,desktop}.png (390 / 768 / 1440 px, 2x)
```

Not in the preview (arrive with the real components): chart hover tooltips, the
"View as table" toggle behaviour, loading/empty/offline states, and keyboard shortcuts.
