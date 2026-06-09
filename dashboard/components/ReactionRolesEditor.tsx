'use client';

import { Card, TextField, ChannelField, RoleSelect, uid } from './settingsKit';
import { EmbedPreview } from './EmbedPreview';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { ReactionRolesSettings, ReactionRolePanel, ReactionRole } from '@/lib/settings';

export function ReactionRolesEditor({
  value,
  onChange,
  accent,
  botName,
}: {
  value: ReactionRolesSettings;
  onChange: (r: ReactionRolesSettings) => void;
  accent?: string;
  botName?: string;
}) {
  const panels = value.panels;
  const setPanels = (next: ReactionRolePanel[]) => onChange({ ...value, panels: next });
  const addPanel = () =>
    setPanels([...panels, { id: uid(), channelId: '', title: 'Pick your roles', description: '', roles: [] }]);
  const patch = (id: string, p: Partial<ReactionRolePanel>) => setPanels(panels.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const remove = (id: string) => setPanels(panels.filter((x) => x.id !== id));

  return (
    <div className="space-y-5">
      <Card title="Reaction-role panels" desc="Members click buttons to give themselves the roles you allow. Post a panel with /roles-panel.">
        {panels.length === 0 && <p className="text-xs text-mist-muted">No panels yet. Add one to get started.</p>}
        <div className="space-y-4">
          {panels.map((panel, idx) => (
            <PanelEditor key={panel.id} index={idx} panel={panel} accent={accent} botName={botName} onChange={(p) => patch(panel.id, p)} onRemove={() => remove(panel.id)} />
          ))}
        </div>
        <button type="button" onClick={addPanel} className="btn-ghost text-sm" disabled={panels.length >= 10}>
          + Add panel
        </button>
      </Card>
    </div>
  );
}

function PanelEditor({
  index,
  panel,
  accent,
  botName,
  onChange,
  onRemove,
}: {
  index: number;
  panel: ReactionRolePanel;
  accent?: string;
  botName?: string;
  onChange: (p: Partial<ReactionRolePanel>) => void;
  onRemove: () => void;
}) {
  const setRoles = (roles: ReactionRole[]) => onChange({ roles });
  const addRole = () => setRoles([...panel.roles, { id: uid(), roleId: '', label: '', emoji: '' }]);
  const patchRole = (id: string, p: Partial<ReactionRole>) => setRoles(panel.roles.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const removeRole = (id: string) => setRoles(panel.roles.filter((r) => r.id !== id));

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-mist">Panel {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-mist-faint hover:text-red-300">
          Remove panel
        </button>
      </div>
      <div className="space-y-3">
        <ChannelField label="Channel" hint="Where /roles-panel posts this panel." types={CHANNEL_TYPES.text} value={panel.channelId} onChange={(channelId) => onChange({ channelId })} />
        <TextField label="Title" value={panel.title} maxLength={256} onChange={(title) => onChange({ title })} />
        <div>
          <span className="label">Description</span>
          <textarea className="input mt-1 min-h-[60px] resize-y" value={panel.description} maxLength={2000} onChange={(e) => onChange({ description: e.target.value })} />
        </div>

        <div>
          <span className="label">Roles</span>
          <div className="mt-1 space-y-2">
            {panel.roles.length === 0 && <p className="text-xs text-mist-muted">No roles in this panel yet.</p>}
            {panel.roles.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/50 px-3 py-2">
                <input
                  className="input w-16 py-1 text-center text-sm"
                  value={r.emoji}
                  maxLength={32}
                  placeholder="🎮"
                  onChange={(e) => patchRole(r.id, { emoji: e.target.value })}
                />
                <input
                  className="input w-40 flex-1 py-1 text-sm"
                  value={r.label}
                  maxLength={80}
                  placeholder="Button label (e.g. Gamer)"
                  onChange={(e) => patchRole(r.id, { label: e.target.value })}
                />
                <div className="w-48">
                  <RoleSelect value={r.roleId} onChange={(roleId) => patchRole(r.id, { roleId })} placeholder="Pick a role" />
                </div>
                <button type="button" onClick={() => removeRole(r.id)} className="text-mist-faint hover:text-red-300">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addRole} className="btn-ghost text-sm" disabled={panel.roles.length >= 25}>
              + Add role
            </button>
          </div>
        </div>

        <div>
          <span className="label">Preview</span>
          <div className="mt-1">
            <EmbedPreview
              botName={botName}
              accent={accent}
              title={panel.title}
              description={panel.description}
              buttons={panel.roles.map((r) => ({ label: r.label || 'Role', emoji: r.emoji || undefined, style: 'secondary' }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
