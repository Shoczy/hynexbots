'use client';

// Shared building blocks for the per-product settings editors
// (ModerationEditor, TicketsEditor, EconomyEditor, MusicEditor).
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Toggle } from './ui';
import { useGuild, type GuildRole } from '@/lib/guildContext';

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export function Card({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="card p-6">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {desc && <p className="mt-1 text-sm text-mist-muted">{desc}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function Row({
  label,
  hint,
  checked,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm font-medium text-mist">{label}</span>
          {hint && <span className="mt-0.5 block text-xs text-mist-muted">{hint}</span>}
        </span>
        <Toggle label="" checked={checked} onChange={onChange} />
      </div>
      {checked && children && <div className="mt-3 border-t border-ink-700/60 pt-3">{children}</div>}
    </div>
  );
}

/** A static (non-toggle) row that just holds inline controls. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">{children}</div>
    </div>
  );
}

export function NumInput({
  value,
  onChange,
  min,
  max,
  width = 'w-20',
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  width?: string;
}) {
  return (
    <input
      type="number"
      className={`input ${width} py-1 text-center text-sm`}
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(clamp(parseInt(e.target.value || '0', 10), min, max))}
    />
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  mono,
  maxLength,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <input
        className={`input mt-1 ${mono ? 'font-mono' : ''}`}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-1.5 text-xs text-mist-muted">{hint}</p>}
    </div>
  );
}

/** A snowflake (role/channel) ID field — digits only. */
export function IdField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextField
      label={label}
      hint={hint}
      value={value}
      onChange={(v) => onChange(v.replace(/\D/g, ''))}
      placeholder="123456789012345678"
      mono
    />
  );
}

export function ChipInput({
  items,
  onChange,
  placeholder,
  validate,
  transform,
  mono,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  validate: (v: string) => boolean;
  transform: (v: string) => string;
  mono?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = transform(draft);
    if (validate(v) && !items.includes(v)) onChange([...items, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.length === 0 && <span className="text-xs text-mist-muted">None yet.</span>}
      {items.map((it) => (
        <span
          key={it}
          className={`inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-mist ${mono ? 'font-mono' : ''}`}
        >
          {it}
          <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} className="text-mist-faint hover:text-red-300">
            ✕
          </button>
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <input
          className="input w-44 py-1 text-xs"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} className="rounded-lg border border-ink-600 px-2 py-1 text-xs text-mist hover:bg-ink-800">
          Add
        </button>
      </span>
    </div>
  );
}

/** Digits-only role-id chip list (e.g. staff/DJ/mod roles). */
export function RoleIdChips({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  return (
    <ChipInput
      items={items}
      onChange={onChange}
      placeholder="Add role ID"
      mono
      transform={(s) => s.replace(/\D/g, '')}
      validate={(s) => /^\d{5,20}$/.test(s)}
    />
  );
}

// ── Custom dark dropdown ──────────────────────────────
// Replaces native <select> (whose popup uses the OS light theme) so the picker
// matches the app: styled trigger + searchable popover, all in the dark palette.

export type PickerOption = { value: string; label: string; color?: string };

export function Picker({
  value,
  onChange,
  options,
  placeholder = 'None',
  allowClear = true,
  searchable = true,
}: {
  value: string;
  onChange: (v: string) => void;
  options: PickerOption[];
  placeholder?: string;
  allowClear?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />}
          <span className={`truncate ${selected ? 'text-mist' : 'text-mist-faint'}`}>{selected ? selected.label : placeholder}</span>
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-mist-faint transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor">
          <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-ink-600 bg-ink-900 shadow-2xl shadow-black/40">
          {searchable && options.length > 6 && (
            <div className="border-b border-ink-700 p-2">
              <input
                autoFocus
                className="input py-1 text-sm"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {allowClear && (
              <button
                type="button"
                onClick={() => pick('')}
                className={`flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-ink-800 ${!value ? 'text-accent' : 'text-mist-muted'}`}
              >
                {placeholder}
              </button>
            )}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-mist-faint">No matches.</p>}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-ink-800 ${o.value === value ? 'text-accent' : 'text-mist'}`}
              >
                {o.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />}
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Guild-aware pickers ───────────────────────────────
// When the bot has synced its roles/channels, show real dropdowns; otherwise
// fall back to manual ID entry so the editor still works pre-sync.

const roleName = (roles: GuildRole[], id: string) => roles.find((r) => r.id === id)?.name ?? id;
const roleHex = (r: GuildRole) => (r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5');

function RoleDot({ roles, id }: { roles: GuildRole[]; id: string }) {
  const c = roles.find((r) => r.id === id)?.color ?? 0;
  const hex = c ? `#${c.toString(16).padStart(6, '0')}` : '#99aab5';
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />;
}

/** Multi-select roles. Chips + an "add" dropdown when synced; ID chips otherwise. */
export function RolePicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { roles, synced } = useGuild();
  if (!synced) {
    return (
      <div className="space-y-1.5">
        <RoleIdChips items={value} onChange={onChange} />
        <p className="text-[11px] text-mist-faint">Connect your bot to pick roles by name instead of pasting IDs.</p>
      </div>
    );
  }
  const available = roles.filter((r) => !value.includes(r.id) && !r.managed && r.name !== '@everyone');
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.length === 0 && <span className="text-xs text-mist-muted">None selected.</span>}
        {value.map((id) => (
          <span key={id} className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-mist">
            <RoleDot roles={roles} id={id} />
            {roleName(roles, id)}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="text-mist-faint hover:text-red-300">
              ✕
            </button>
          </span>
        ))}
      </div>
      {available.length > 0 && (
        <div className="w-52">
          <Picker
            value=""
            onChange={(id) => id && onChange([...value, id])}
            options={available.map((r) => ({ value: r.id, label: r.name, color: roleHex(r) }))}
            placeholder="+ Add role…"
            allowClear={false}
          />
        </div>
      )}
    </div>
  );
}

/** Single role select. Dropdown when synced; ID input otherwise. */
export function RoleSelect({ value, onChange, placeholder = 'None' }: { value: string; onChange: (id: string) => void; placeholder?: string }) {
  const { roles, synced } = useGuild();
  if (!synced) {
    return (
      <input className="input font-mono" value={value} placeholder="Role ID (optional)" onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    );
  }
  const known = roles.some((r) => r.id === value);
  const options = roles
    .filter((r) => !r.managed && r.name !== '@everyone')
    .map((r) => ({ value: r.id, label: r.name, color: roleHex(r) }));
  if (value && !known) options.unshift({ value, label: `${value} (unknown)`, color: '#99aab5' });
  return <Picker value={value} onChange={onChange} options={options} placeholder={placeholder} />;
}

/** Single channel select, optionally filtered by Discord channel type. */
export function ChannelSelect({
  value,
  onChange,
  types,
  placeholder = 'None',
}: {
  value: string;
  onChange: (id: string) => void;
  types?: number[];
  placeholder?: string;
}) {
  const { channels } = useGuild();
  if (channels.length === 0) {
    return <input className="input font-mono" value={value} placeholder="123456789012345678" onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />;
  }
  const list = types ? channels.filter((c) => types.includes(c.type)) : channels;
  const known = list.some((c) => c.id === value);
  const options = list.map((c) => ({ value: c.id, label: `#${c.name}` }));
  if (value && !known) options.unshift({ value, label: `${value} (unknown)` });
  return <Picker value={value} onChange={onChange} options={options} placeholder={placeholder} />;
}

// Labeled wrappers (drop-in for the editors).
export function RolesField({ label, hint, value, onChange }: { label: string; hint?: string; value: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      {hint && <p className="mb-2 mt-0.5 text-xs text-mist-muted">{hint}</p>}
      <div className={hint ? '' : 'mt-1'}>
        <RolePicker value={value} onChange={onChange} />
      </div>
    </div>
  );
}

export function RoleField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-1">
        <RoleSelect value={value} onChange={onChange} />
      </div>
      {hint && <p className="mt-1.5 text-xs text-mist-muted">{hint}</p>}
    </div>
  );
}

export function ChannelField({
  label,
  hint,
  value,
  onChange,
  types,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (id: string) => void;
  types?: number[];
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-1">
        <ChannelSelect value={value} onChange={onChange} types={types} />
      </div>
      {hint && <p className="mt-1.5 text-xs text-mist-muted">{hint}</p>}
    </div>
  );
}
