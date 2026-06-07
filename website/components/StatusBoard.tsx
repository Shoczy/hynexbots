'use client';

import { useEffect, useState } from 'react';
import { brand } from '@/lib/data';

type Node = {
  name: string;
  online: boolean;
  cpu: number | null;
  mem: number | null;
  bots: { total: number; online: number };
  lastSeen: number | null;
};

type Incident = {
  node: string;
  startedAt: number;
  resolvedAt: number | null;
  ongoing: boolean;
  durationMs: number;
};

type FleetData = {
  operational: boolean;
  nodes: { total: number; online: number };
  bots: { total: number; online: number };
  uptimePct: number;
  list: Node[];
  incidents?: Incident[];
  updatedAt: number;
};

type State =
  | { kind: 'loading' }
  | { kind: 'live'; data: FleetData }
  | { kind: 'error' };

function relativeTime(ts: number | null): string {
  if (!ts) return 'never';
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

export function StatusBoard() {
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
        if (active) setState((prev) => (prev.kind === 'live' ? prev : { kind: 'error' }));
      }
    }

    load();
    const id = setInterval(load, 15_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const live = state.kind === 'live' ? state.data : null;
  const operational = live ? live.operational : true;

  return (
    <section className="relative pt-32 pb-24 md:pt-40">
      <div className="container-content max-w-4xl">
        {/* Headline banner */}
        <div className="glass relative overflow-hidden rounded-2xl border border-ink-700 px-6 py-7 md:px-9 md:py-8">
          <div
            className={`absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl ${
              state.kind === 'error'
                ? 'bg-rose-500/15'
                : operational
                  ? 'bg-emerald-500/15'
                  : 'bg-amber-500/15'
            }`}
          />
          <div className="relative flex items-center gap-4">
            <StatusDot
              tone={state.kind === 'error' ? 'down' : operational ? 'up' : 'warn'}
              live={state.kind === 'live'}
            />
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-mist md:text-3xl">
                {state.kind === 'loading'
                  ? 'Checking fleet status…'
                  : state.kind === 'error'
                    ? 'Status currently unavailable'
                    : operational
                      ? 'All systems operational'
                      : 'Partial fleet disruption'}
              </h1>
              <p className="mt-1 text-sm text-mist-muted">
                {state.kind === 'live'
                  ? `Live from the Hynex monitoring fleet · updated ${relativeTime(live!.updatedAt)}`
                  : state.kind === 'error'
                    ? 'We could not reach the monitoring fleet. Retrying automatically.'
                    : 'Connecting to the monitoring fleet…'}
              </p>
            </div>
          </div>

          {live && (
            <div className="relative mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700">
              <Metric label="Fleet uptime" value={`${live.uptimePct.toFixed(1)}%`} />
              <Metric label="Nodes online" value={`${live.nodes.online}/${live.nodes.total || '—'}`} />
              <Metric label="Bots running" value={`${live.bots.online}`} />
            </div>
          )}
        </div>

        {/* Per-node breakdown */}
        <div className="mt-10">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-mist-faint">
            Nodes
          </h2>

          {state.kind === 'loading' && <SkeletonRows />}

          {state.kind === 'error' && (
            <EmptyCard>Monitoring fleet unreachable — this page refreshes on its own.</EmptyCard>
          )}

          {live && live.list.length === 0 && (
            <EmptyCard>No nodes are reporting in yet. Agents appear here once they connect.</EmptyCard>
          )}

          {live && live.list.length > 0 && (
            <div className="flex flex-col gap-3">
              {live.list.map((node) => (
                <NodeRow key={node.name} node={node} />
              ))}
            </div>
          )}
        </div>

        {/* Incident history */}
        {live && (
          <div className="mt-12">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-mist-faint">
              Incident history
            </h2>
            {live.incidents && live.incidents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {live.incidents.map((inc) => (
                  <IncidentRow key={`${inc.node}-${inc.startedAt}`} incident={inc} />
                ))}
              </div>
            ) : (
              <EmptyCard>No incidents recorded. Every node has stayed healthy. 🎉</EmptyCard>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-mist-faint">
          This page refreshes automatically every 15 seconds.
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900/70 px-5 py-4 text-center">
      <div className="font-display text-2xl font-semibold tracking-tight text-mist">{value}</div>
      <div className="mt-1 text-xs text-mist-faint">{label}</div>
    </div>
  );
}

function NodeRow({ node }: { node: Node }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-700 bg-ink-900/50 px-5 py-4">
      <div className="flex items-center gap-3">
        <StatusDot tone={node.online ? 'up' : 'down'} live={node.online} />
        <div>
          <div className="font-medium text-mist">{node.name}</div>
          <div className="text-xs text-mist-faint">
            {node.online ? `Online · ${relativeTime(node.lastSeen)}` : `Offline · ${relativeTime(node.lastSeen)}`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 text-sm text-mist-muted">
        {node.cpu != null && <Stat label="CPU" value={`${node.cpu}%`} />}
        {node.mem != null && <Stat label="MEM" value={`${node.mem}%`} />}
        <Stat label="Bots" value={`${node.bots.online}/${node.bots.total}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="font-display text-base font-semibold text-mist">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-mist-faint">{label}</div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function IncidentRow({ incident }: { incident: Incident }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-900/50 px-5 py-4">
      <div className="flex items-center gap-3">
        <StatusDot tone={incident.ongoing ? 'down' : 'warn'} live={incident.ongoing} />
        <div>
          <div className="font-medium text-mist">
            {incident.node} {incident.ongoing ? 'is offline' : 'was offline'}
          </div>
          <div className="text-xs text-mist-faint">
            Started {formatWhen(incident.startedAt)}
            {incident.resolvedAt ? ` · recovered ${formatWhen(incident.resolvedAt)}` : ''}
          </div>
        </div>
      </div>
      <span
        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
          incident.ongoing
            ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            : 'border-ink-600 bg-ink-800 text-mist-muted'
        }`}
      >
        {incident.ongoing ? `Ongoing · ${formatDuration(incident.durationMs)}` : `Resolved · ${formatDuration(incident.durationMs)}`}
      </span>
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-700 bg-ink-900/30 px-6 py-10 text-center text-sm text-mist-muted">
      {children}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[68px] animate-pulse rounded-xl border border-ink-700 bg-ink-900/40"
        />
      ))}
    </div>
  );
}

function StatusDot({ tone, live }: { tone: 'up' | 'warn' | 'down'; live: boolean }) {
  const color = tone === 'up' ? 'bg-emerald-400' : tone === 'warn' ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <span className="relative grid h-3 w-3 shrink-0 place-items-center">
      {live && <span className={`absolute h-3 w-3 animate-ping rounded-full ${color} opacity-60`} />}
      <span className={`relative h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}
