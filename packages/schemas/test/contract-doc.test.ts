import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderContractDoc } from './contract-doc';

const docPath = fileURLToPath(
  new URL('../../../docs/plans/00-shared/api-contract.md', import.meta.url),
);

describe('api-contract.md', () => {
  it('is up to date with the endpoint registry', () => {
    const expected = renderContractDoc();
    if (process.env['UPDATE_CONTRACT_DOC'] === '1') writeFileSync(docPath, expected);
    expect(readFileSync(docPath, 'utf8')).toBe(expected);
  });
});
