import type { Metadata, Viewport } from 'next';
import './globals.css';
import { brand } from '@/lib/data';

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description:
    'Hynex Bots designs, builds, and ships premium custom Discord bots. Ready-made bots delivered same-day, bespoke commissions on a timeline you can trust.',
  keywords: ['discord bot', 'custom discord bot', 'discord bot shop', 'buy discord bot', 'hynex bots'],
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: 'Premium custom Discord bots, designed and shipped fast.',
    type: 'website',
  },
  metadataBase: new URL('https://hynexbots.com'),
};

export const viewport: Viewport = {
  themeColor: '#08090b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain relative overflow-x-hidden">{children}</body>
    </html>
  );
}
