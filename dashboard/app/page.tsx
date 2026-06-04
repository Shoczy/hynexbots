import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Logo, DiscordIcon } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (getSession()) redirect('/dashboard');

  return (
    <main className="flex min-h-screen flex-col">
      <header className="container-content flex items-center justify-between py-6">
        <Logo />
        <a href="https://hynexbots.com" className="text-sm text-mist-muted transition-colors hover:text-mist">
          ← Back to site
        </a>
      </header>

      <div className="container-content flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md text-center">
          <span className="eyebrow">Customer Dashboard</span>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tightest sm:text-5xl">
            Customize <span className="text-gradient-accent">your bot.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-mist-muted">
            Log in with Discord to manage the bots you’ve purchased — prefix, modules, messages and more.
          </p>

          {searchParams?.error === 'auth' && (
            <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Login failed or was cancelled. Please try again.
            </p>
          )}

          <a href="/api/auth/login" className="btn-primary mt-8 w-full py-3 text-base">
            <DiscordIcon className="h-5 w-5" />
            Continue with Discord
          </a>

          <p className="mt-6 text-xs text-mist-faint">
            Don’t have a bot yet?{' '}
            <a href="https://hynexbots.com" className="text-accent-soft hover:underline">
              Browse the shop →
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
