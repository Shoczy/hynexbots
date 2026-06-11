import type { Metadata, Viewport } from 'next';
import './globals.css';
import { brand } from '@/lib/data';

const DESC =
  'Hynex Bots designs, builds, and ships premium custom Discord bots. Ready-made bots delivered same-day, bespoke commissions on a timeline you can trust — hosting included.';

export const metadata: Metadata = {
  metadataBase: new URL('https://hynexbots.xyz'),
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: DESC,
  keywords: ['discord bot', 'custom discord bot', 'discord bot shop', 'buy discord bot', 'fivem discord bot', 'discord security bot', 'hynex bots'],
  alternates: { canonical: '/' },
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: 'Premium custom Discord bots, designed and shipped fast.',
    url: 'https://hynexbots.xyz',
    siteName: brand.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${brand.name} — ${brand.tagline}`,
    description: 'Premium custom Discord bots, designed and shipped fast.',
  },
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
