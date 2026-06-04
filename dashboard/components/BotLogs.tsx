'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui';

type LogLine = { t: number; line: string; level: 'out' | 'err' | 'sys' };

function time(t: number) {
  return new Date(t).toLocaleTimeString([], { hour12: false });
}

const LEVEL_CLASS: Record<string, string> = {
  out: 'text-[#c8cdd4]',
  err: 'text-red-300',
  sys: 'text-accent',
};

export function BotLogs({ appId }: { appId: string }) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [hosted, setHosted] = useState(true);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/bot/${appId}/logs`, { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs || []);
        setHosted(data.hosted);
        setRunning(data.running);
      }
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [auto, refresh]);

  // Stick to the bottom when the user is already there.
  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  if (loading) {
    return (
      <div className="card flex items-center gap-3 px-5 py-6 text-sm text-mist-muted">
        <Spinner className="h-4 w-4" /> Loading logs…
      </div>
    );
  }

  if (!hosted) {
    return (
      <div className="card px-5 py-6 text-sm text-mist-muted">
        Logs are only available for bots hosted by Hynex. Bring this bot online with{' '}
        <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-mist">/bots host</code> to see its activity here.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-sm font-medium text-mist">Live logs</span>
          <span className="text-xs text-mist-faint">{logs.length} line{logs.length === 1 ? '' : 's'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAuto((a) => !a)}
            className={`text-xs ${auto ? 'text-accent' : 'text-mist-muted hover:text-mist'}`}
          >
            {auto ? '● Auto-refresh' : '○ Auto-refresh'}
          </button>
          <button onClick={refresh} className="btn-ghost text-xs">
            Refresh
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="max-h-[460px] min-h-[200px] overflow-y-auto bg-[#0b0d12] px-4 py-3 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-mist-faint">No output yet. When the bot runs, its activity shows up here.</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="flex gap-3 whitespace-pre-wrap break-all">
              <span className="shrink-0 select-none text-[#4b5563]">{time(l.t)}</span>
              <span className={LEVEL_CLASS[l.level] || 'text-mist'}>{l.line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
