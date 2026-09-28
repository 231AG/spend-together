// F4 exit criterion 8: the dev scenario switcher never ships. Run after `next build`;
// fails if its marker appears anywhere in the production client bundle.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '.next', 'static');
const MARKERS = ['data-dev-scenario-switcher', 'Mock API scenario'];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (full.endsWith('.js')) yield full;
  }
}

const hits = [];
for (const file of files(root)) {
  const text = readFileSync(file, 'utf8');
  for (const m of MARKERS) if (text.includes(m)) hits.push(`${path.relative(root, file)}: ${m}`);
}
if (hits.length > 0) {
  console.error(`Dev-only code found in the production bundle:\n${hits.join('\n')}`);
  process.exit(1);
}
console.log('Production bundle is free of dev-only scenario code.');
