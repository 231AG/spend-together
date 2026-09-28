import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { bodyFont, headingFont } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'SpendTogether',
  description: 'Track income and expenses and reach savings goals, alone or together.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
