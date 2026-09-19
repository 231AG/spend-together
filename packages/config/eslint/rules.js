/**
 * The three rules that protect SpendTogether's non-negotiables (see /CLAUDE.md).
 *
 * Implemented as `no-restricted-syntax` selectors rather than a custom plugin.
 * The F0 phase file's risk table blesses this trade-off: the rules stay readable
 * and fast, at the cost of slightly blunter messages than a bespoke plugin would
 * give. Revisit only if a rule needs type information.
 */

/** Identifiers that hold money. Matching these is how the money rule finds its targets. */
const MONEY_IDENTIFIER = '/(_minor$|^amount|^balance|^target_amount|^base_amount|Minor$)/';

/**
 * Rule 1 — money is integer minor units (CLAUDE.md, spec 6.1).
 * No float parsing, no float arithmetic on money. Rates use decimal.js.
 */
export const moneyRules = [
  {
    selector: "CallExpression[callee.name='parseFloat']",
    message:
      'Money is integer minor units (spec 6.1). parseFloat is banned — parse to an integer, or use decimal.js for a rate.',
  },
  {
    selector: `CallExpression[callee.name='Number'] > Identifier[name=${MONEY_IDENTIFIER}]`,
    message:
      'Money is integer minor units (spec 6.1). Do not coerce a money value with Number() — it produces a float.',
  },
  {
    selector: `BinaryExpression[operator=/^[*/]$/] > Identifier[name=${MONEY_IDENTIFIER}]`,
    message:
      'Money is integer minor units (spec 6.1). Multiplying or dividing money inline produces a float — use packages/domain.',
  },
  {
    selector: "MemberExpression[object.name='Math'][property.name='round']",
    message:
      'Rounding money is half away from zero, once per record (spec 6.1). Use roundHalfAwayFromZero from packages/domain, not Math.round.',
  },
];

/**
 * Rule 2 — time is injected, never ambient (CLAUDE.md, spec BR-16).
 * Period boundaries depend on the user's timezone and must be testable.
 * Only lib/clock.ts may construct the current instant.
 */
export const clockRules = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message:
      'No ambient clock (BR-16). Inject the clock from lib/clock.ts so period boundaries and "today" stay testable.',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message:
      'No ambient clock (BR-16). Inject the clock from lib/clock.ts so period boundaries and "today" stay testable.',
  },
];

/**
 * Rule 3 — import boundaries (docs/plans/00-shared/repo-structure.md).
 * Dependencies point downward only: app -> components/lib/server -> packages.
 */
export const domainBoundaryImports = {
  paths: [
    { name: 'react', message: 'packages/domain is pure. No framework imports.' },
    { name: 'next', message: 'packages/domain is pure. No framework imports.' },
    { name: 'zod', message: 'packages/domain is pure. Contract types live in packages/schemas.' },
  ],
  patterns: [
    {
      group: ['next/*', 'react/*', 'react-dom*'],
      message: 'packages/domain is pure. No framework imports.',
    },
    { group: ['@supabase/*'], message: 'packages/domain is pure. No database imports.' },
    {
      group: ['@spendtogether/schemas*'],
      message: 'packages/domain must not depend on the contract package.',
    },
    { group: ['**/server/**'], message: 'packages/domain is pure. No server imports.' },
  ],
};

export const schemasBoundaryImports = {
  patterns: [
    {
      group: ['next*', 'react*', '@supabase/*'],
      message: 'packages/schemas is the contract. Only zod.',
    },
    {
      group: ['@spendtogether/domain*'],
      message: 'packages/schemas must not depend on the domain package.',
    },
  ],
};

export const componentsBoundaryImports = {
  patterns: [
    {
      group: ['**/server/**', '@/server/*'],
      message:
        'Components must not import server code (repo-structure.md). Pass data in as props instead.',
    },
  ],
};
