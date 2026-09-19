import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import {
  moneyRules,
  clockRules,
  domainBoundaryImports,
  schemasBoundaryImports,
  componentsBoundaryImports,
} from './rules.js';

/** Shared base: applies to every workspace. */
export const base = tseslint.config(
  {
    ignores: ['**/dist/**', '**/.next/**', '**/coverage/**', '**/.turbo/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': ['error', ...moneyRules, ...clockRules],
    },
  },
);

/** packages/domain — pure, and the only place money arithmetic is allowed. */
export const domain = tseslint.config(...base, {
  rules: { 'no-restricted-imports': ['error', domainBoundaryImports] },
});

/** packages/schemas — the frozen contract. */
export const schemas = tseslint.config(...base, {
  rules: { 'no-restricted-imports': ['error', schemasBoundaryImports] },
});

/** apps/web — components may not reach into server code. */
export const web = tseslint.config(
  ...base,
  {
    files: ['components/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', componentsBoundaryImports] },
  },
  {
    // lib/clock.ts is the one place allowed to read the real clock.
    files: ['lib/clock.ts'],
    rules: { 'no-restricted-syntax': ['error', ...moneyRules] },
  },
);

export { moneyRules, clockRules };
export default base;
