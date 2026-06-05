'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import type { UsageStats } from '@/lib/configApi';

type Guild = { name: string; roles: number; channels: number; syncedAt: number } | null;

export function AnalyticsPanel({ appId }: { appId: string }) {
  const [usage, setUsage] = useState<UsageStats | null>(null);
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
        <p className="mt-1 text-sm text-mist-muted">Command usage over the last {usage.days} days.</p>
      </div>

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
