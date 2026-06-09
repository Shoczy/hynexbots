'use client';

import { Logo } from './ui';
import { withBase } from '@/lib/paths';

type User = { id: string; username: string; global_name?: string | null; avatar: string | null };

function avatarUrl(u: User) {
  if (u.avatar) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`;
  return `https://cdn.discordapp.com/embed/avatars/0.png`;
}

export function TopBar({ user }: { user?: User | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-700/60 bg-ink-950/70 backdrop-blur-xl">
      <div className="container-content flex items-center justify-between py-4">
        <a href={withBase('/bots')}>
          <Logo />
        </a>
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-full border border-ink-700 bg-ink-900/60 py-1 pl-1 pr-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl(user)} alt="" className="h-7 w-7 rounded-full" />
              <span className="text-sm font-medium text-mist">{user.global_name || user.username}</span>
            </div>
            <a href={withBase('/api/auth/logout')} className="text-sm text-mist-muted transition-colors hover:text-mist">
              Log out
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
