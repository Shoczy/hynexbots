'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import type { UsageStats, HealthStats, BotIncident } from '@/lib/configApi';

type Guild = { name: string; roles: number; channels: number; syncedAt: number } | null;

function formatDuration(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return mins % 60 ? `${hrs}h ${mins % 60}m` : `${hrs}h`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function relativeTime(ts: number | null): string {
  if (!ts) return 'never';
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function AnalyticsPanel({ appId }: { appId: string }) {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [health, setHealth] = useState<HealthStats | null>(null);
  const [incidents, setIncidents] = useState<BotIncident[]>([]);
  const [guild, setGuild] = useState<Guild>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/bot/${appId}/stats?days=14`, { cache: 'no-store' });
        const data = await res.json();
        if (data.ok) {
          setUsage(data.usage);
          setHealth(data.health ?? null);
          setIncidents(data.incidents ?? []);
          setGuild(data.guild ?? null);
        } else {
          setFailed(true);
        }
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [appId]);

  if (loading) {
    return (
      <div className="card flex items-center gap-3 px-5 py-4 text-sm text-mist-muted">
        <Spinner className="h-4 w-4" /> Loading analytics…
      </div>
    );
  }
  if (failed || !usage) {
    return <div className="card px-5 py-4 text-sm text-mist-muted">Analytics aren’t available right now.</div>;
  }

  const maxCmd = Math.max(1, ...usage.perCommand.map((c) => c.count));
  const maxDay = Math.max(1, ...usage.byDay.map((d) => d.count));
  const empty = usage.total === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Analytics</h2>
        <p className="mt-1 text-sm text-mist-muted">Uptime and command usage over the last {usage.days} days.</p>
      </div>

      {health && <UptimeCard health={health} />}

      {incidents.length > 0 && <IncidentList incidents={incidents} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Commands today" value={usage.totalToday} />
        <Stat label={`Last ${usage.days} days`} value={usage.total} />
        {guild && <Stat label="Server" value={guild.name} small />}
      </div>

      {empty ? (
        <div className="card border-dashed px-6 py-10 text-center text-sm text-mist-muted">
          No command usage recorded yet. Once people use your bot’s commands, you’ll see what’s popular here.
        </div>
      ) : (
        <>
          <div className="card p-5">
            <div className="mb-3 text-sm font-medium text-mist">Top commands</div>
            <div className="space-y-2">
              {usage.perCommand.slice(0, 12).map((c) => (
                <div key={c.command} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 truncate font-mono text-xs text-mist-muted">/{c.command}</div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(c.count / maxCmd) * 100}%` }} />
                  </div>
                  <div className="w-10 shrink-0 text-right text-xs tabular-nums text-mist">{c.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 text-sm font-medium text-mist">Daily activity</div>
            <div className="flex h-28 items-end gap-1">
              {usage.byDay.map((d) => (
                <div key={d.day} className="group relative flex-1" title={`${d.day}: ${d.count}`}>
                  <div
                    className="w-full rounded-t bg-accent/70 transition-colors group-hover:bg-accent"
                    style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function uptimeColor(pct: number | null): string {
  if (pct == null) return 'bg-ink-700';
  if (pct >= 99) return 'bg-emerald-400';
  if (pct >= 90) return 'bg-amber-400';
  return 'bg-rose-400';
}

function UptimeCard({ health }: { health: HealthStats }) {
  if (health.uptimePct == null) {
    return (
      <div className="card border-dashed px-6 py-8 text-center text-sm text-mist-muted">
        No uptime data yet. Once your bot connects to the config service, its uptime appears here.
      </div>
    );
  }
  const online = health.lastSeen != null && Date.now() - health.lastSeen < 10 * 60 * 1000;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-mist">Uptime</div>
          <div className="text-xs text-mist-faint">
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {online ? 'Online' : 'Offline'} · last seen {relativeTime(health.lastSeen)}
          </div>
        </div>
        <div className="font-display text-3xl font-semibold tracking-tight text-mist">
          {health.uptimePct.toFixed(1)}
          <span className="text-lg text-mist-faint">%</span>
        </div>
      </div>

      {health.byDay.length > 0 && (
        <div className="mt-5 flex h-16 items-end gap-1">
          {health.byDay.map((d) => (
            <div key={d.day} className="group relative flex-1" title={`${d.day}: ${d.pct == null ? '—' : `${d.pct}%`}`}>
              <div
                className={`w-full rounded-t ${uptimeColor(d.pct)} opacity-80 transition-opacity group-hover:opacity-100`}
                style={{ height: `${Math.max(4, d.pct ?? 0)}%` }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-mist-faint">
        <span>{health.byDay[0]?.day}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function IncidentList({ incidents }: { incidents: BotIncident[] }) {
  return (
    <div className="card p-5">
      <div className="mb-3 text-sm font-medium text-mist">Incident history</div>
      <div className="space-y-2">
        {incidents.map((inc) => (
          <div
            key={inc.startedAt}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-900/40 px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span className={`h-2 w-2 rounded-full ${inc.ongoing ? 'bg-rose-400' : 'bg-mist-faint'}`} />
              <div className="text-xs text-mist-muted">
                {inc.ongoing ? 'Offline since ' : 'Offline '}
                {formatWhen(inc.startedAt)}
                {inc.resolvedAt ? ` → ${formatWhen(inc.resolvedAt)}` : ''}
              </div>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                inc.ongoing
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-ink-600 bg-ink-800 text-mist-faint'
              }`}
            >
              {inc.ongoing ? `Ongoing · ${formatDuration(inc.durationMs)}` : formatDuration(inc.durationMs)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="card px-5 py-4">
      <div className={`font-display font-semibold tracking-tight text-mist ${small ? 'truncate text-lg' : 'text-2xl'}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-mist-faint">{label}</div>
    </div>
  );
}
