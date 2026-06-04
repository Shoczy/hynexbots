'use client';

import { useEffect, useState } from 'react';
import { Reveal } from './ui/Reveal';
import { brand } from '@/lib/data';

type FleetData = {
  operational: boolean;
  nodes: { total: number; online: number };
  bots: { total: number; online: number };
  uptimePct: number;
  updatedAt: number;
};

type State =
  | { kind: 'loading' }
  | { kind: 'live'; data: FleetData }
  | { kind: 'offline' };

export function FleetStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(brand.fleetStatusUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as FleetData;
        if (active) setState({ kind: 'live', data });
      } catch {
        if (active) setState((prev) => (prev.kind === 'live' ? prev : { kind: 'offline' }));
      }
    }

    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const live = state.kind === 'live' ? state.data : null;
  const operational = live ? live.operational : true;

  const metrics = [
    {
      label: 'Fleet uptime',
      value: live ? `${live.uptimePct.toFixed(1)}%` : '99.9%',
    },
    {
      label: 'Nodes online',
      value: live ? `${live.nodes.online}/${live.nodes.total || '—'}` : '—',
    },
    {
      label: 'Bots running',
      value: live ? `${live.bots.online}` : '—',
    },
  ];

  return (
    <section id="status" className="relative py-16">
      <div className="container-content">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-2xl border border-ink-700 px-6 py-7 md:px-9 md:py-8">
            <div
              className={`absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl ${
                operational ? 'bg-emerald-500/15' : 'bg-amber-500/15'
              }`}
            />
            <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              {/* Status headline */}
              <div className="flex items-center gap-3.5">
                <StatusDot operational={operational} live={state.kind === 'live'} />
                <div>
                  <div className="font-display text-xl font-semibold tracking-tight text-mist">
                    {state.kind === 'loading'
                      ? 'Checking fleet status…'
                      : operational
                        ? 'All systems operational'
                        : 'Partial fleet disruption'}
                  </div>
                  <div className="mt-0.5 text-sm text-mist-muted">
                    {state.kind === 'live'
                      ? 'Live from the Hynex monitoring fleet'
                      : 'Typical performance across our VPS fleet'}
                  </div>
                </div>
              </div>

              {/* Live metrics */}
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700">
                {metrics.map((m) => (
                  <div key={m.label} className="bg-ink-900/70 px-5 py-4 text-center md:px-7">
                    <div className="font-display text-2xl font-semibold tracking-tight text-mist">
                      {m.value}
                    </div>
                    <div className="mt-1 whitespace-nowrap text-xs text-mist-faint">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StatusDot({ operational, live }: { operational: boolean; live: boolean }) {
  const color = operational ? 'bg-emerald-400' : 'bg-amber-400';
  return (
    <span className="relative grid h-3 w-3 shrink-0 place-items-center">
      {live && (
        <span className={`absolute h-3 w-3 animate-ping rounded-full ${color} opacity-60`} />
      )}
      <span className={`relative h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}
