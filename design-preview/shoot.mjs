// Screenshots every page at mobile, tablet and desktop widths, 2x device scale.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pages } from './src/pages.mjs';

const viewports = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};
const overlays = new Set(['add-sheet', 'add-expense']);
const only = process.argv[2];

const dist = new URL('./dist/', import.meta.url).pathname;
const shots = new URL('./screenshots/', import.meta.url).pathname;
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [vp, size] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const slug of Object.keys(pages)) {
    if (only && slug !== only) continue;
    await page.goto(`file://${dist}${slug}.html`);
    await page.evaluate(() => document.fonts.ready);
    // Grow the viewport to the document height so fixed nav, FAB and sticky bars sit at the real bottom.
    const h = overlays.has(slug) ? size.height : Math.max(size.height, await page.evaluate(() => document.documentElement.scrollHeight));
    await page.setViewportSize({ width: size.width, height: h });
    await page.screenshot({ path: `${shots}${slug}--${vp}.png` });
    await page.setViewportSize(size);
  }
  await ctx.close();
}
await browser.close();
console.log('screenshots ->', shots);
