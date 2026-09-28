import localFont from 'next/font/local';

// Self-hosted faces (spec §17.4): no request to a font CDN, no layout shift. The files are
// the Latin subsets from @fontsource 5.3.0 (SIL OFL 1.1, licences alongside). next/font
// generates size-adjusted fallbacks so swapping in the web font does not shift layout.

export const bodyFont = localFont({
  src: [
    { path: './fonts/inter-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/inter-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body-face',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const headingFont = localFont({
  src: [
    { path: './fonts/plus-jakarta-sans-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/plus-jakarta-sans-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/plus-jakarta-sans-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-heading-face',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});
