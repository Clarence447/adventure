import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClawOps AI Command Center',
  description: 'An OpenClaw-style agent workspace for connecting chat channels, tools, workflows, and local-first automation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
