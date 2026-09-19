import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'SpendTogether',
  description: 'Track. Save. Grow. Together.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
