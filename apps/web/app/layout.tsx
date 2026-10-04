import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { bodyFont, headingFont } from './fonts';
import './globals.css';
import { PWA_COLORS } from '@/lib/pwa-colors.generated';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SpendTogether',
  description: 'Track income and expenses and reach savings goals, alone or together.',
  applicationName: 'SpendTogether',
  appleWebApp: { capable: true, title: 'SpendTogether', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

// Installed (standalone) the app draws under the notch and home indicator; the shell pads
// with env(safe-area-inset-*) (F12-02).
export const viewport: Viewport = {
  themeColor: PWA_COLORS.theme,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
