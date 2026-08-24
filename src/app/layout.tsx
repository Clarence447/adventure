import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revenue Recovery AI',
  description: 'Missed-call recovery and lead follow-up for local service businesses.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
