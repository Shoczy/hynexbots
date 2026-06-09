'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import { withBase } from '@/lib/paths';
import type { Order, License } from '@/lib/configApi';

const STATUS_STYLES: Record<Order['status'], string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  paid: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  delivered: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-ink-600 bg-ink-800 text-mist-faint',
};
const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Pending',
  paid: 'Paid',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function BillingPanel() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(withBase('/api/me/billing'), { cache: 'no-store' });
        const data = await res.json();
        if (data.ok) {
          setOrders(data.orders || []);
          setLicenses(data.licenses || []);
        } else {
          setFailed(true);
        }
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="card flex items-center gap-3 px-5 py-4 text-sm text-mist-muted">
        <Spinner className="h-4 w-4" /> Loading purchase history…
      </div>
    );
  }
  if (failed) {
    return <div className="card px-5 py-4 text-sm text-mist-muted">Purchase history isn’t available right now.</div>;
  }
  if (orders.length === 0 && licenses.length === 0) {
    return (
      <div className="card border-dashed px-6 py-8 text-center text-sm text-mist-muted">
        No purchases yet. Orders you place in a ticket show up here as invoices.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-ink-700 px-5 py-3 text-sm font-medium text-mist">Orders</div>
          <div className="divide-y divide-ink-800">
            {orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span className="font-mono text-xs text-mist-faint">{o.id}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-mist">
                    {o.productLabel}
                    {o.botName ? <span className="text-mist-muted"> · {o.botName}</span> : null}
                  </div>
                  <div className="text-xs text-mist-faint">
                    {fmtDate(o.createdAt)}
                    {o.payment ? ` · ${o.payment}` : ''}
                  </div>
                </div>
                {o.price && <span className="text-sm tabular-nums text-mist">{o.price}</span>}
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[o.status]}`}
                >
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {licenses.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-ink-700 px-5 py-3 text-sm font-medium text-mist">Licenses</div>
          <div className="divide-y divide-ink-800">
            {licenses.map((l) => (
              <div key={l.appId} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-800 text-lg">
                  {l.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-mist">{l.name}</div>
                  <div className="text-xs text-mist-faint">
                    {l.label} · registered {fmtDate(l.registeredAt)}
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    l.status === 'active'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
