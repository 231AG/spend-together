// Renders every preview screen to dist/*.html with self-hosted fonts and generated illustrations.
import { mkdirSync, writeFileSync, copyFileSync, cpSync } from 'node:fs';
import { pages } from './src/pages.mjs';

const out = new URL('./dist/', import.meta.url).pathname;
mkdirSync(`${out}assets/fonts`, { recursive: true });

const fonts = {
  'inter-400': '@fontsource/inter/files/inter-latin-400-normal.woff2',
  'inter-500': '@fontsource/inter/files/inter-latin-500-normal.woff2',
  'inter-600': '@fontsource/inter/files/inter-latin-600-normal.woff2',
  'inter-700': '@fontsource/inter/files/inter-latin-700-normal.woff2',
  'jakarta-600': '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff2',
  'jakarta-700': '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2',
  'jakarta-800': '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2',
};
for (const [name, path] of Object.entries(fonts)) copyFileSync(`node_modules/${path}`, `${out}assets/fonts/${name}.woff2`);
cpSync('assets/illustrations', `${out}assets/illustrations`, { recursive: true });
copyFileSync('src/styles.css', `${out}styles.css`);

for (const [slug, page] of Object.entries(pages)) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#047857">
<title>${page.title} | SpendTogether</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>${page.body()}</body>
</html>`;
  writeFileSync(`${out}${slug}.html`, html);
}
console.log(`built ${Object.keys(pages).length} pages -> ${out}`);
