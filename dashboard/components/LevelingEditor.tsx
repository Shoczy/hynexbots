'use client';

import { Card, Row, StatRow, NumInput, ChannelField, RoleSelect, RolesField, uid } from './settingsKit';
import { EmbedPreview } from './EmbedPreview';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { LevelingSettings, LevelReward } from '@/lib/settings';

export function LevelingEditor({
  value,
  onChange,
  accent,
  botName,
}: {
  value: LevelingSettings;
  onChange: (l: LevelingSettings) => void;
  accent?: string;
  botName?: string;
}) {
  const set = (patch: Partial<LevelingSettings>) => onChange({ ...value, ...patch });
  const xp = value.xpPerMessage;
  const lu = value.levelUp;

  return (
    <div className="space-y-5">
      <Card title="XP gain" desc="How members earn experience from chatting.">
        <StatRow>
          <span className="text-mist">XP per message</span>
          <NumInput value={xp.min} min={0} max={1000} onChange={(min) => set({ xpPerMessage: { ...xp, min } })} />
          <span>to</span>
          <NumInput value={xp.max} min={0} max={1000} onChange={(max) => set({ xpPerMessage: { ...xp, max } })} />
        </StatRow>
        <StatRow>
          <span className="text-mist">Cooldown between rewards</span>
          <NumInput value={value.cooldownSec} min={0} max={3600} width="w-24" onChange={(cooldownSec) => set({ cooldownSec })} />
          <span>seconds</span>
        </StatRow>
        <RolesField label="No-XP roles" hint="Members with these roles earn no XP." value={value.noXpRoleIds} onChange={(noXpRoleIds) => set({ noXpRoleIds })} />
      </Card>

      <Card title="Level-up announcement" desc="Celebrate members when they reach a new level.">
        <Row label="Announce level-ups" checked={lu.enabled} onChange={(enabled) => set({ levelUp: { ...lu, enabled } })}>
          <div className="space-y-3">
            <ChannelField
              label="Announcement channel"
              hint="Leave empty to announce in the channel where they leveled up."
              types={CHANNEL_TYPES.text}
              value={lu.channelId}
              onChange={(channelId) => set({ levelUp: { ...lu, channelId } })}
            />
            <div>
              <span className="label">Message</span>
              <textarea
                className="input mt-1 min-h-[70px] resize-y"
                value={lu.message}
                maxLength={1000}
                onChange={(e) => set({ levelUp: { ...lu, message: e.target.value } })}
                placeholder="GG {user}, you reached level {level}!"
              />
              <p className="mt-1.5 text-xs text-mist-muted">
                Variables: <span className="font-mono text-accent-soft">{'{user}'}</span>{' '}
                <span className="font-mono text-accent-soft">{'{level}'}</span>{' '}
                <span className="font-mono text-accent-soft">{'{server}'}</span>
              </p>
            </div>
            <div>
              <span className="label">Preview</span>
              <div className="mt-1">
                <EmbedPreview botName={botName} accent={accent} description={lu.message || 'GG {user}, you reached level {level}! 🎉'} />
              </div>
            </div>
          </div>
        </Row>
      </Card>

      <Card title="Role rewards" desc="Grant a role automatically when a member reaches a level.">
        <Row
          label="Keep lower reward roles"
          hint="When on, members keep every reward they've earned. When off, only the highest is kept."
          checked={value.stackRewards}
          onChange={(stackRewards) => set({ stackRewards })}
        />
        <RewardsEditor value={value.rewards} onChange={(rewards) => set({ rewards })} />
      </Card>
    </div>
  );
}

function RewardsEditor({ value, onChange }: { value: LevelReward[]; onChange: (r: LevelReward[]) => void }) {
  const add = () => onChange([...value, { id: uid(), level: (value.at(-1)?.level ?? 0) + 5, roleId: '' }]);
  const patch = (id: string, p: Partial<LevelReward>) => onChange(value.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const remove = (id: string) => onChange(value.filter((r) => r.id !== id));

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-xs text-mist-muted">No role rewards yet.</p>}
      {value.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3 text-sm text-mist-muted">
          <span>At level</span>
          <NumInput value={r.level} min={1} max={1000} onChange={(level) => patch(r.id, { level })} />
          <span>→</span>
          <div className="min-w-[12rem] flex-1">
            <RoleSelect value={r.roleId} onChange={(roleId) => patch(r.id, { roleId })} placeholder="Pick a role" />
          </div>
          <button type="button" onClick={() => remove(r.id)} className="text-mist-faint hover:text-red-300">
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-ghost text-sm">
        + Add reward
      </button>
    </div>
  );
}
