import type { MetadataRoute } from 'next';
import { PWA_COLORS } from '@/lib/pwa-colors.generated';

// F12-02 (§8.1, §19.3): installable, opening standalone on Home. Colours come from the
// design tokens via scripts/generate-pwa-assets.mjs.

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SpendTogether',
    short_name: 'SpendTogether',
    description: 'Track income and expenses and reach savings goals, alone or together.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: PWA_COLORS.theme,
    background_color: PWA_COLORS.background,
    categories: ['finance'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
