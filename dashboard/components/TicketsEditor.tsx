'use client';

import { Card, Row, StatRow, NumInput, TextField, ChannelField, RolesField, uid } from './settingsKit';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { TicketsSettings, TicketCategory } from '@/lib/settings';

export function TicketsEditor({ value, onChange }: { value: TicketsSettings; onChange: (t: TicketsSettings) => void }) {
  const set = (patch: Partial<TicketsSettings>) => onChange({ ...value, ...patch });
  const pn = value.panel;
  const tr = value.transcripts;

  return (
    <div className="space-y-5">
      <Card title="Ticket panel" desc="The message members click to open a ticket.">
        <TextField label="Panel title" value={pn.title} maxLength={256} onChange={(title) => set({ panel: { ...pn, title } })} />
        <TextField label="Panel description" value={pn.description} maxLength={1000} onChange={(description) => set({ panel: { ...pn, description } })} />
        <TextField label="Button label" value={pn.buttonLabel} maxLength={80} onChange={(buttonLabel) => set({ panel: { ...pn, buttonLabel } })} />
      </Card>

      <Card title="Routing & staff" desc="Where tickets open and who handles them.">
        <ChannelField
          label="Ticket category"
          hint="New ticket channels are created under this category."
          types={CHANNEL_TYPES.category}
          value={value.categoryId}
          onChange={(categoryId) => set({ categoryId })}
        />
        <RolesField label="Staff roles" hint="These roles can view and respond to tickets." value={value.staffRoleIds} onChange={(staffRoleIds) => set({ staffRoleIds })} />
        <StatRow>
          <span className="text-mist">Max open tickets per member</span>
          <NumInput value={value.maxOpenPerUser} min={1} max={50} onChange={(maxOpenPerUser) => set({ maxOpenPerUser })} />
        </StatRow>
        <div>
          <span className="label">Opening message</span>
          <textarea
            className="input mt-1 min-h-[90px] resize-y"
            value={value.openMessage}
            maxLength={1000}
            onChange={(e) => set({ openMessage: e.target.value })}
            placeholder="Shown to the member when their ticket opens."
          />
        </div>
      </Card>

      <Card title="Workflow">
        <Row label="Claim system" hint="Let a staff member claim a ticket so others know it's handled." checked={value.claiming} onChange={(claiming) => set({ claiming })} />
        <Row
          label="Save transcripts"
          hint="Post a log of each closed ticket."
          checked={tr.enabled}
          onChange={(enabled) => set({ transcripts: { ...tr, enabled } })}
        >
          <ChannelField label="Transcript channel" types={CHANNEL_TYPES.text} value={tr.channelId} onChange={(channelId) => set({ transcripts: { ...tr, channelId } })} />
        </Row>
      </Card>

      <Card title="Ticket topics" desc="Optional categories members pick from when opening a ticket.">
        <CategoriesEditor value={value.categories} onChange={(categories) => set({ categories })} />
      </Card>
    </div>
  );
}

function CategoriesEditor({ value, onChange }: { value: TicketCategory[]; onChange: (c: TicketCategory[]) => void }) {
  const add = () => onChange([...value, { id: uid(), label: '', emoji: '' }]);
  const patch = (id: string, p: Partial<TicketCategory>) => onChange(value.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const remove = (id: string) => onChange(value.filter((c) => c.id !== id));

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-xs text-mist-muted">No topics — members open a single general ticket.</p>}
      {value.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3">
          <input
            className="input w-16 py-1 text-center text-sm"
            value={c.emoji}
            maxLength={16}
            placeholder="🎟️"
            onChange={(e) => patch(c.id, { emoji: e.target.value })}
          />
          <input
            className="input flex-1 py-1 text-sm"
            value={c.label}
            maxLength={50}
            placeholder="Topic name (e.g. Billing)"
            onChange={(e) => patch(c.id, { label: e.target.value })}
          />
          <button type="button" onClick={() => remove(c.id)} className="text-mist-faint hover:text-red-300">
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-ghost text-sm">
        + Add topic
      </button>
    </div>
  );
}
