/**
 * Proves the three custom lint rules actually fire (F0 exit criterion 3).
 *
 * A lint rule nobody has seen fail is a lint rule you do not have. This runs
 * ESLint over deliberate violations and asserts each is caught, then over a
 * compliant file and asserts silence. Run in CI alongside `pnpm lint`.
 */
import { ESLint } from 'eslint';
import { base, domain } from '@spendtogether/config/eslint';

const expectations = [
  {
    file: 'tools/lint-fixtures/violations/money.ts',
    config: base,
    rule: 'money',
    minErrors: 5,
    mustMention: ['parseFloat', 'Number()', 'minor units', 'half away from zero'],
  },
  {
    file: 'tools/lint-fixtures/violations/clock.ts',
    config: base,
    rule: 'ambient clock',
    minErrors: 2,
    mustMention: ['ambient clock'],
  },
  {
    file: 'tools/lint-fixtures/violations/boundary.ts',
    config: domain,
    rule: 'import boundary',
    minErrors: 2,
    mustMention: ['pure'],
  },
];

let failed = false;

for (const { file, config, rule, minErrors, mustMention } of expectations) {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config });
  const [result] = await eslint.lintFiles([file]);
  const count = result?.errorCount ?? 0;
  const messages = (result?.messages ?? []).map((m) => m.message).join(' | ');

  if (count < minErrors) {
    console.error(`FAIL  ${rule}: expected >= ${minErrors} errors in ${file}, got ${count}`);
    failed = true;
    continue;
  }

  const missing = mustMention.filter((phrase) => !messages.includes(phrase));
  if (missing.length > 0) {
    console.error(`FAIL  ${rule}: messages missing ${missing.map((m) => `"${m}"`).join(', ')}`);
    console.error(`      got: ${messages}`);
    failed = true;
    continue;
  }

  console.log(`ok    ${rule} rule fired ${count} times on ${file}`);
}

{
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: base });
  const results = await eslint.lintFiles(['tools/lint-fixtures/compliant/*.ts']);
  const total = results.reduce((sum, r) => sum + r.errorCount, 0);
  if (total > 0) {
    console.error(`FAIL  compliant fixtures produced ${total} error(s):`);
    for (const r of results) {
      for (const m of r.messages) console.error(`      ${r.filePath}:${m.line} ${m.message}`);
    }
    failed = true;
  } else {
    console.log('ok    compliant fixtures are clean');
  }
}

if (failed) {
  console.error(
    '\nLint rule verification FAILED — a rule that should protect this project is not working.',
  );
  process.exit(1);
}
console.log('\nAll three custom lint rules verified.');
