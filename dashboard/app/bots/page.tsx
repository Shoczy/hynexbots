'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TopBar } from '@/components/TopBar';
import { Spinner } from '@/components/ui';
import { BillingPanel } from '@/components/BillingPanel';
import { withBase } from '@/lib/paths';

type User = { id: string; username: string; global_name?: string | null; avatar: string | null };
type Bot = {
  appId: string;
  name: string;
  type: string;
  label: string;
  emoji: string;
  isOwner: boolean;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [serviceDown, setServiceDown] = useState(false);

  async function load() {
    const res = await fetch(withBase('/api/me'), { cache: 'no-store' });
    if (res.status === 401) {
      window.location.href = withBase('/');
      return;
    }
    const data = await res.json().catch(() => null);
    if (data) {
      setUser(data.user ?? null);
      setBots(data.bots || []);
      setServiceDown(data.serviceUp === false);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="flex min-h-[60vh] items-center justify-center text-mist-muted">
          <Spinner className="h-6 w-6" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar user={user} />
      <main className="container-content py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-3xl font-semibold tracking-tightest">Your bots</h1>
          <p className="mt-1.5 text-mist-muted">Select a bot to customize its settings.</p>
        </motion.div>

        {serviceDown && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Can’t reach the bot service right now — your bots will appear once it’s back online.
          </div>
        )}

        {/* Bots */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {bots.map((b, i) => (
            <motion.a
              key={b.appId}
              href={withBase(`/bots/${b.appId}`)}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="card group flex items-center gap-4 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-ink-600"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-ink-700 bg-ink-800 text-2xl">
                {b.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-lg font-semibold">{b.name}</h3>
                  {b.isOwner && (
                    <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-glow">
                      Owner
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-mist-muted">{b.label}</p>
              </div>
              <span className="text-mist-faint transition-transform duration-300 group-hover:translate-x-1">→</span>
            </motion.a>
          ))}

          {bots.length === 0 && (
            <div className="card col-span-full p-8 text-center text-mist-muted">
              No bots linked yet. If you just bought one, it’ll appear here automatically once our team registers it to your account.
            </div>
          )}
        </div>

        {/* Purchases & licenses */}
        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Purchases &amp; licenses</h2>
          <p className="mt-1 text-sm text-mist-muted">Your order history and the licenses linked to your account.</p>
          <div className="mt-5">
            <BillingPanel />
          </div>
        </div>
      </main>
    </>
  );
}
