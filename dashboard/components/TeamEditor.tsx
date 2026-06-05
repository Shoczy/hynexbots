'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui';
import { EDIT_TABS, permLabel } from '@/lib/permissions';
import type { TeamMember } from '@/lib/configApi';

type Loaded = {
  ownerId: string | null;
  isOwner: boolean;
  members: TeamMember[];
  available: string[]; // permission tokens offered for this bot's product
};

const ID_RE = /^\d{5,20}$/;

export function TeamEditor({ appId }: { appId: string }) {
  const [state, setState] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/bot/${appId}/members`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Failed to load team.');
        return;
      }
      // Offer only edit tokens that apply to this bot's product, plus `process`.
      const available = [...EDIT_TABS.filter((t) => (data.tabs || []).includes(t)), 'process'];
      setState({ ownerId: data.ownerId, isOwner: data.isOwner, members: data.members || [], available });
      setError(null);
    } catch {
      setError('Network error — try again.');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

  async function mutate(init: RequestInit) {
    const res = await fetch(`/api/bot/${appId}/members`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const data = await res.json();
    if (data.ok) {
      setState((s) => (s ? { ...s, members: data.members || [] } : s));
      return true;
    }
    setError(humanError(data.error));
    return false;
  }

  if (loading) {
    return (
      <div className="card flex items-center gap-3 px-5 py-4 text-sm text-mist-muted">
        <Spinner className="h-4 w-4" /> Loading team…
      </div>
    );
  }
  if (error && !state) {
    return <div className="card px-5 py-4 text-sm text-red-300">{error}</div>;
  }
  if (!state) return null;

  if (!state.isOwner) {
    return (
      <div className="card px-5 py-4 text-sm text-mist-muted">
        Only the bot owner can manage the team.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Team & permissions</h2>
        <p className="mt-1 text-sm text-mist-muted">
          Invite people by their Discord user ID and choose exactly what each can manage. You can change or remove
          access at any time.
        </p>
      </div>

      {error && <div className="card px-4 py-3 text-sm text-red-300">{error}</div>}

      <AddMember available={state.available} onAdd={(memberId, permissions) =>
        mutate({ method: 'POST', body: JSON.stringify({ memberId, permissions }) })
      } />

      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-mist-faint">
          Members ({state.members.length})
        </div>
        {state.members.length === 0 ? (
          <div className="card border-dashed px-5 py-8 text-center text-sm text-mist-muted">
            No team members yet. Add someone above to let them help manage this bot.
          </div>
        ) : (
          state.members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              available={state.available}
              onSave={(permissions) =>
                mutate({ method: 'PATCH', body: JSON.stringify({ memberId: m.userId, permissions }) })
              }
              onRemove={() => {
                if (!window.confirm('Remove this member’s access to the bot?')) return;
                mutate({ method: 'DELETE', body: JSON.stringify({ memberId: m.userId }) });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AddMember({
  available,
  onAdd,
}: {
  available: string[];
  onAdd: (memberId: string, permissions: string[]) => Promise<boolean>;
}) {
  const [memberId, setMemberId] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const valid = ID_RE.test(memberId.trim());

  async function submit() {
    if (!valid) return;
    setBusy(true);
    const ok = await onAdd(memberId.trim(), perms);
    setBusy(false);
    if (ok) {
      setMemberId('');
      setPerms([]);
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="text-sm font-medium text-mist">Add a member</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <input
            className="input font-mono"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value.replace(/\D/g, ''))}
            placeholder="Discord user ID e.g. 709393455519891486"
            maxLength={20}
          />
          <p className="mt-1.5 text-xs text-mist-muted">
            In Discord: User Settings → Advanced → Developer Mode, then right-click a user → Copy User ID.
          </p>
        </div>
        <button onClick={submit} disabled={!valid || busy} className="btn-primary">
          {busy ? <Spinner className="h-4 w-4" /> : null}
          {busy ? 'Adding…' : 'Add member'}
        </button>
      </div>
      <PermPicker available={available} selected={perms} onChange={setPerms} />
    </div>
  );
}

function MemberRow({
  member,
  available,
  onSave,
  onRemove,
}: {
  member: TeamMember;
  available: string[];
  onSave: (permissions: string[]) => Promise<boolean>;
  onRemove: () => void;
}) {
  const [perms, setPerms] = useState<string[]>(member.permissions);
  const [busy, setBusy] = useState(false);
  const dirty = !sameSet(perms, member.permissions);

  // Keep local state in sync if the list reloads (e.g. after another save).
  useEffect(() => setPerms(member.permissions), [member.permissions]);

  async function save() {
    setBusy(true);
    await onSave(perms);
    setBusy(false);
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-mist">{member.userId}</div>
          <div className="text-xs text-mist-muted">
            {member.permissions.length === 0
              ? 'View only — can see status & logs'
              : `${member.permissions.length} permission${member.permissions.length > 1 ? 's' : ''}`}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Remove
        </button>
      </div>

      <PermPicker available={available} selected={perms} onChange={setPerms} />

      {dirty && (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setPerms(member.permissions)} className="btn-ghost text-sm">
            Reset
          </button>
          <button onClick={save} disabled={busy} className="btn-primary text-sm">
            {busy ? <Spinner className="h-4 w-4" /> : null}
            {busy ? 'Saving…' : 'Save permissions'}
          </button>
        </div>
      )}
    </div>
  );
}

function PermPicker({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(token: string) {
    onChange(selected.includes(token) ? selected.filter((p) => p !== token) : [...selected, token]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {available.map((token) => {
        const on = selected.includes(token);
        return (
          <button
            key={token}
            type="button"
            onClick={() => toggle(token)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              on
                ? 'border-accent bg-accent/15 text-mist'
                : 'border-ink-700 bg-ink-900/40 text-mist-muted hover:border-ink-600'
            }`}
          >
            {on ? '✓ ' : ''}
            {permLabel(token)}
          </button>
        );
      })}
    </div>
  );
}

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

function humanError(code: string) {
  const map: Record<string, string> = {
    owner_only: 'Only the owner can change the team.',
    invalid_member_id: 'That doesn’t look like a valid Discord user ID.',
    is_owner: 'That user is already the owner.',
    no_access: 'You don’t have access to this bot.',
  };
  return map[code] || 'Something went wrong.';
}
