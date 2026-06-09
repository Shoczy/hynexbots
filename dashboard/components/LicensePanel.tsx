'use client';

import { useEffect, useState } from 'react';
import { Field, Spinner } from '@/components/ui';
import { withBase } from '@/lib/paths';
import type { LicenseInfo } from '@/lib/configApi';

function fmtDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function LicensePanel({ appId }: { appId: string }) {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [transferId, setTransferId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    try {
      const res = await fetch(withBase(`/api/bot/${appId}/license`), { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setLicense(data.license);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  async function transfer(e: React.FormEvent) {
    e.preventDefault();
    const target = transferId.trim();
    if (!/^\d{17,20}$/.test(target)) {
      setMsg({ type: 'err', text: 'Enter a valid Discord user ID (17–20 digits).' });
      return;
    }
    if (!confirm(`Transfer this bot to user ${target}? You will lose owner access immediately.`)) return;
    setTransferring(true);
    setMsg(null);
    const res = await fetch(withBase(`/api/bot/${appId}/license`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transfer', newOwnerId: target }),
    });
    const data = await res.json();
    setTransferring(false);
    if (data.ok) {
      setMsg({ type: 'ok', text: 'Ownership transferred. Redirecting…' });
      setTimeout(() => (window.location.href = withBase('/bots')), 1200);
    } else {
      const human: Record<string, string> = {
        invalid_user_id: 'That isn’t a valid Discord user ID.',
        already_owner: 'That account already owns this bot.',
        owner_only: 'Only the current owner can transfer this bot.',
      };
      setMsg({ type: 'err', text: human[data.error] || data.error || 'Transfer failed.' });
    }
  }

  if (loading) {
    return (
      <div className="card flex items-center gap-3 px-5 py-4 text-sm text-mist-muted">
        <Spinner className="h-4 w-4" /> Loading…
      </div>
    );
  }
  if (failed || !license) {
    return <div className="card px-5 py-4 text-sm text-mist-muted">Ownership details aren’t available right now.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Ownership</h2>
        <p className="mt-1 text-sm text-mist-muted">Registration details and ownership transfer.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card px-5 py-4">
          <div className="font-display text-lg font-semibold capitalize text-mist">{license.status}</div>
          <div className="mt-1 text-xs text-mist-faint">Status</div>
        </div>
        <div className="card px-5 py-4">
          <div className="font-display text-lg font-semibold text-mist">{fmtDate(license.registeredAt)}</div>
          <div className="mt-1 text-xs text-mist-faint">Registered</div>
        </div>
        <div className="card px-5 py-4">
          <div className="font-display text-lg font-semibold text-mist">{fmtDate(license.claimedAt)}</div>
          <div className="mt-1 text-xs text-mist-faint">Owned since</div>
        </div>
      </div>

      {/* Transfer ownership */}
      <div className="card border-red-500/20 p-5">
        <div className="text-sm font-medium text-mist">Transfer ownership</div>
        <p className="mt-1 text-xs text-mist-muted">
          Hand this bot to another Discord account. You’ll immediately lose owner access — this can’t be undone from here.
        </p>
        <form onSubmit={transfer} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Field label="New owner — Discord user ID">
              <input
                className="input font-mono"
                placeholder="123456789012345678"
                value={transferId}
                onChange={(e) => setTransferId(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
          <button
            type="submit"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            disabled={transferring}
          >
            {transferring ? 'Transferring…' : 'Transfer'}
          </button>
        </form>
      </div>

      {msg && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            msg.type === 'ok'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
