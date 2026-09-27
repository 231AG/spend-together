// Fixtures for the three project rules: each must fire on its violation and stay quiet
// on the compliant form (F0 exit criterion 3).
import path from 'node:path';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';
import importBoundaries from './rules/import-boundaries.js';
import noAmbientDate from './rules/no-ambient-date.js';
import noFloatMoney from './rules/no-float-money.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: 'module' } });
const at = (rel) => path.join(process.cwd(), rel);

tester.run('no-float-money', noFloatMoney, {
  valid: [
    'const total = a.amountMinor + b.amountMinor;',
    'const half = Math.trunc(amountMinor / 2);',
    'const pct = parseFloat(input);',
    'const n = Number(count);',
    'const rate = new Decimal(rateText).times(3);',
  ],
  invalid: [
    { code: 'const x = parseFloat(amount);', errors: [{ messageId: 'parse' }] },
    { code: 'const x = Number(tx.amount_minor);', errors: [{ messageId: 'parse' }] },
    { code: 'const x = Number.parseFloat(balance);', errors: [{ messageId: 'parse' }] },
    { code: 'const x = amountMinor * 1.1;', errors: [{ messageId: 'fraction' }] },
    { code: 'const x = 0.5 * goal.balance;', errors: [{ messageId: 'fraction' }] },
    { code: 'const s = totalMinor.toFixed(2);', errors: [{ messageId: 'toFixed' }] },
    { code: 'const x = parseFloat(String(amountMinor));', errors: [{ messageId: 'parse' }] },
    { code: 'const x = Number(balance.toString());', errors: [{ messageId: 'parse' }] },
    { code: 'const x = parseFloat(goal.target.formatted);', errors: [{ messageId: 'parse' }] },
  ],
});

tester.run('no-ambient-date', noAmbientDate, {
  valid: [
    { code: 'const d = new Date(iso);', filename: at('apps/web/components/x.ts') },
    { code: 'const d = clock.now();', filename: at('apps/web/components/x.ts') },
    {
      code: 'export const now = () => new Date();',
      filename: at('apps/web/lib/clock.ts'),
      options: [{ allow: ['apps/web/lib/clock.ts'] }],
    },
  ],
  invalid: [
    {
      code: 'const d = new Date();',
      filename: at('apps/web/components/x.ts'),
      errors: [{ messageId: 'ambient' }],
    },
    {
      code: 'const t = Date.now();',
      filename: at('packages/domain/src/x.ts'),
      errors: [{ messageId: 'ambient' }],
    },
  ],
});

tester.run('import-boundaries', importBoundaries, {
  valid: [
    { code: "import { z } from 'zod';", filename: at('packages/schemas/src/a.ts') },
    { code: "import { b } from './b';", filename: at('packages/schemas/src/a.ts') },
    { code: "import Decimal from 'decimal.js';", filename: at('packages/domain/src/fx.ts') },
    {
      code: "import { formatInTimeZone } from 'date-fns-tz';",
      filename: at('packages/domain/src/period.ts'),
    },
    { code: "import { x } from '@/lib/clock';", filename: at('apps/web/server/services/a.ts') },
    { code: "import { it } from 'vitest';", filename: at('packages/domain/src/money.test.ts') },
    {
      code: "import { defineConfig } from 'vitest/config';",
      filename: at('packages/domain/vitest.config.ts'),
    },
    {
      code: "import { Button } from '@/components/ui/button';",
      filename: at('apps/web/app/page.tsx'),
    },
  ],
  invalid: [
    {
      code: "import { Button } from '@/components/ui/button';",
      filename: at('apps/web/server/services/a.ts'),
      errors: [{ messageId: 'layer' }],
    },
    {
      code: "import { svc } from '../../server/services/a';",
      filename: at('apps/web/components/ui/b.tsx'),
      errors: [{ messageId: 'layer' }],
    },
    {
      code: "import React from 'react';",
      filename: at('packages/domain/src/a.ts'),
      errors: [{ messageId: 'pure' }],
    },
    {
      code: "import { z } from 'zod';",
      filename: at('packages/domain/src/a.ts'),
      errors: [{ messageId: 'pure' }],
    },
    {
      code: "import { x } from '../../../apps/web/lib/clock';",
      filename: at('packages/domain/src/a.ts'),
      errors: [{ messageId: 'escape' }],
    },
    {
      code: "export * from 'next/server';",
      filename: at('packages/schemas/src/a.ts'),
      errors: [{ messageId: 'pure' }],
    },
  ],
});
