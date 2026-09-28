---
name: component-checklist
description: Definition of done for any UI component in SpendTogether (apps/web/components). Load whenever a component is added or changed, or a screen composes components in a new way.
---

# component-checklist

Spec §14.3 is the catalogue; §17–20 are the rules. A component is done when every box holds.

## Build

- [ ] Tokens only: token utilities (`bg-bg-card`, `type-label`, `z-(--z-modal)`,
      `duration-(--dur-base)`). A missing value becomes a token in
      `packages/config/tailwind/tokens.css`. `no-hardcoded-design-values` must pass.
- [ ] Money through `MoneyText` / `format-money`, amounts from `@spendtogether/domain`;
      load the `money-handling` skill.
- [ ] Colour is never the only carrier of meaning: status, deltas and selection add an
      icon and text.
- [ ] No text pair outside `contrast.test.ts`'s allowed list (never `fg-muted` on
      `bg-subtle`).
- [ ] Touch targets ≥ `--touch-min` (44 px); text in rem; survives 200% zoom and 320 px.
- [ ] Motion only through duration tokens, so reduced motion collapses it.
- [ ] Overlays use the Radix primitives already in `components/ui` (focus trap, Esc,
      focus return).

## Prove

- [ ] Stories in `*.stories.tsx` for every variant and every state (default, hover/focus
      via keyboard, disabled, loading, empty, error, long content, non-base currency).
- [ ] `stories.a11y.test.tsx` passes (axe on every story, no serious/critical).
- [ ] Behaviour test for the keyboard path, focus management and ARIA wiring
      (`components.test.tsx` pattern: Testing Library + user-event).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm --filter @spendtogether/web build-storybook`.
- [ ] Screen-reader name read aloud makes sense as a sentence (e.g. transaction rows).
