import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hynex Bots — Dashboard',
  description: 'Customize your Hynex bot. Log in with Discord to manage your server’s settings.',
};

export const viewport: Viewport = {
  themeColor: '#08090b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen overflow-x-hidden">
        {/* Atmospheric backdrop */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-ink-950">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(ellipse 90% 50% at 50% 0%, #000 40%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 90% 50% at 50% 0%, #000 40%, transparent 100%)',
            }}
          />
          <div
            className="absolute -top-40 left-1/2 h-[460px] w-[760px] -translate-x-1/2 rounded-full blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 65%)' }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
