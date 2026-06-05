'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProcessStatus } from '@/lib/configApi';
import { Spinner } from '@/components/ui';

function uptimeLabel(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Labeled wrapper so the status block is always easy to find on the page. */
function Section({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-mist-faint">Bot status</div>
      {children}
    </div>
  );
}

export function ProcessControl({ appId, canControl = true }: { appId: string; canControl?: boolean }) {
  const [status, setStatus] = useState<ProcessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<null | 'restart' | 'stop' | 'start'>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/bot/${appId}/process`, { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setStatus(data.process);
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000); // keep status fresh
    return () => clearInterval(t);
  }, [refresh]);

  async function act(action: 'restart' | 'stop' | 'start') {
    if (action === 'stop' && !window.confirm('Take this bot offline? It will stop responding until you start it again.')) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/bot/${appId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok) setStatus(data.process);
      else setError(humanError(data.error));
    } catch {
      setError('Network error — try again.');
    } finally {
      setBusy(null);
      setTimeout(refresh, 2500); // re-check for live uptime after a restart
    }
  }

  if (loading) {
    return (
      <Section>
        <div className="card flex items-center gap-3 px-5 py-4 text-sm text-mist-muted">
          <Spinner className="h-4 w-4" /> Checking bot status…
        </div>
      </Section>
    );
  }

  // Couldn't reach the bot service — show it rather than hiding the whole block.
  if (failed && !status) {
    return (
      <Section>
        <div className="card flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <Dot color="bg-amber-400" />
            <div className="text-sm">
              <span className="font-medium text-mist">Status unavailable</span>
              <p className="text-xs text-mist-muted">Couldn’t reach the bot service. It may be offline.</p>
            </div>
          </div>
          <button onClick={refresh} className="btn-ghost text-sm">
            Retry
          </button>
        </div>
      </Section>
    );
  }
  if (!status) return null;

  // Not hostable from here (custom build, or it runs on its own server).
  if (!status.hosted) {
    const note = status.managed
      ? 'This bot isn’t hosted by Hynex yet, so it can’t be started from here. Re-register it with its token (via /register-bot) to control it from the dashboard.'
      : 'This bot runs on its own host — start, stop and updates are managed there.';
    return (
      <Section>
        <div className="card flex items-center gap-3 px-5 py-4">
          <Dot color="bg-mist-muted" />
          <div className="text-sm">
            <span className="font-medium text-mist">{status.managed ? 'Not hosted here' : 'Externally hosted'}</span>
            <p className="text-xs text-mist-muted">{note}</p>
          </div>
        </div>
      </Section>
    );
  }

  const online = status.running;
  return (
    <Section>
      <div className="card flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Dot color={online ? 'bg-emerald-400' : 'bg-red-400'} pulse={online} />
          <div className="text-sm">
            <span className="font-medium text-mist">{online ? 'Online' : 'Offline'}</span>
            <p className="text-xs text-mist-muted">
              {online ? `Running · up ${uptimeLabel(status.uptimeMs)}` : 'Stopped'}
              {status.restarts > 0 && ` · ${status.restarts} auto-restart${status.restarts > 1 ? 's' : ''}`}
            </p>
            {error && <p className="mt-0.5 text-xs text-red-300">{error}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!canControl ? (
            <span className="text-xs text-mist-faint">View only</span>
          ) : online ? (
            <>
              <button onClick={() => act('restart')} disabled={busy !== null} className="btn-ghost text-sm">
                {busy === 'restart' ? <Spinner className="h-4 w-4" /> : null}
                {busy === 'restart' ? 'Restarting…' : 'Restart'}
              </button>
              <button
                onClick={() => act('stop')}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3.5 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                {busy === 'stop' ? <Spinner className="h-4 w-4" /> : null}
                {busy === 'stop' ? 'Stopping…' : 'Stop'}
              </button>
            </>
          ) : (
            <button onClick={() => act('start')} disabled={busy !== null} className="btn-primary text-sm">
              {busy === 'start' ? <Spinner className="h-4 w-4" /> : null}
              {busy === 'start' ? 'Starting…' : 'Start bot'}
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}

function Dot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

function humanError(code: string) {
  const map: Record<string, string> = {
    not_hosted: 'This bot isn’t hosted here.',
    no_product: 'No runnable build for this bot type.',
    install_failed: 'Dependency install failed — check the host logs.',
    no_access: 'You don’t have permission to control this bot.',
    unknown: 'That bot isn’t registered for hosting.',
  };
  return map[code] || 'Something went wrong.';
}
