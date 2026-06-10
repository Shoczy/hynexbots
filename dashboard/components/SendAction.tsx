'use client';

import { useState } from 'react';
import { withBase } from '@/lib/paths';
import { Spinner } from './ui';

const ERRORS: Record<string, string> = {
  not_hosted: 'Your bot isn’t running right now — start it first.',
  not_in_scope: 'This action isn’t available for this bot.',
  forbidden: 'You don’t have permission to do that.',
  no_access: 'You don’t have access to this bot.',
  unknown_action: 'Unknown action.',
  service_unavailable: 'The bot service is unreachable right now.',
};

/**
 * A button that dispatches an action to the running bot (e.g. "post the verify
 * panel"). Shows inline success/error so the customer never has to leave the
 * dashboard for Discord.
 */
export function SendAction({
  appId,
  action,
  payload,
  label,
  hint,
}: {
  appId: string;
  action: string;
  payload?: Record<string, unknown>;
  label: string;
  hint?: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function go() {
    setState('sending');
    setMsg('');
    try {
      const res = await fetch(withBase(`/api/bot/${appId}/dispatch`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: payload || {} }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        setState('ok');
        setMsg('Sent — your bot is posting it now.');
      } else {
        setState('err');
        setMsg(ERRORS[data.error] || 'Couldn’t send that.');
      }
    } catch {
      setState('err');
      setMsg('Couldn’t reach the server.');
    }
    setTimeout(() => setState((s) => (s === 'sending' ? s : 'idle')), 4000);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={go} disabled={state === 'sending'} className="btn-ghost text-sm">
        {state === 'sending' ? <Spinner className="h-4 w-4" /> : null}
        {label}
      </button>
      {hint && state === 'idle' && <span className="text-xs text-mist-faint">{hint}</span>}
      {state === 'ok' && <span className="text-xs text-emerald-300">✓ {msg}</span>}
      {state === 'err' && <span className="text-xs text-red-300">{msg}</span>}
    </div>
  );
}
