// Shared flat config for the whole workspace. The root eslint.config.js re-exports it.
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import importBoundaries from './rules/import-boundaries.js';
import noAmbientDate from './rules/no-ambient-date.js';
import noFloatMoney from './rules/no-float-money.js';

export const spendtogether = {
  rules: {
    'import-boundaries': importBoundaries,
    'no-ambient-date': noAmbientDate,
    'no-float-money': noFloatMoney,
  },
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      'design-preview/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: process.cwd() },
    },
    plugins: { spendtogether },
    rules: {
      'spendtogether/no-float-money': 'error',
      'spendtogether/import-boundaries': 'error',
      'spendtogether/no-ambient-date': ['error', { allow: ['apps/web/lib/clock.ts'] }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
    },
    settings: { next: { rootDir: 'apps/web/' } },
  },
  {
    // Plain JS tooling files (this config, rule modules) are not part of any tsconfig.
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: { process: 'readonly', console: 'readonly' },
    },
  },
);
