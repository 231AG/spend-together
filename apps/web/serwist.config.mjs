// F12-01: builds worker/sw.ts into public/sw.js after `next build`, with the precache
// manifest of the build's static assets and fonts, the prerendered pages (the app shell,
// /offline included) and the icons.
import { generateGlobPatterns, serwist } from '@serwist/next/config';

export default await serwist({
  swSrc: 'worker/sw.ts',
  swDest: 'public/sw.js',
  // Next's defaults leave out the self-hosted fonts (§19.3: "precache app shell, fonts").
  globPatterns: [...generateGlobPatterns('.next/'), '.next/static/media/**/*.woff2'],
  // The mock worker belongs to Storybook only.
  globIgnores: ['public/mockServiceWorker.js'],
});
