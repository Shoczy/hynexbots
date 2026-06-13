'use client';

import { Card, Row, StatRow, NumInput, ChannelField, ChannelsField, RoleSelect, RolesField, uid } from './settingsKit';
import { EmbedPreview } from './EmbedPreview';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { LevelingSettings, LevelReward, XpMultiplier } from '@/lib/settings';

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
  const voice = value.voice;

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
        <Row
          label="Image rank card"
          hint="Show /rank as a generated image (avatar, level, rank & progress bar). When off, a text embed is used."
          checked={value.rankCard}
          onChange={(rankCard) => set({ rankCard })}
        />
        <RolesField label="No-XP roles" hint="Members with these roles earn no XP." value={value.noXpRoleIds} onChange={(noXpRoleIds) => set({ noXpRoleIds })} />
        <ChannelsField
          label="No-XP channels"
          hint="Messages and voice activity in these channels earn no XP."
          value={value.noXpChannelIds}
          onChange={(noXpChannelIds) => set({ noXpChannelIds })}
        />
      </Card>

      <Card title="Voice XP" desc="Reward members for spending time in voice channels.">
        <Row label="Earn XP in voice" checked={voice.enabled} onChange={(enabled) => set({ voice: { ...voice, enabled } })}>
          <div className="space-y-3">
            <StatRow>
              <span className="text-mist">XP per minute in voice</span>
              <NumInput value={voice.xpPerMinute} min={0} max={1000} onChange={(xpPerMinute) => set({ voice: { ...voice, xpPerMinute } })} />
            </StatRow>
            <Row
              label="Anti-AFK"
              hint="No XP while muted, deafened, or alone in a channel — stops members idling for XP."
              checked={voice.antiAfk}
              onChange={(antiAfk) => set({ voice: { ...voice, antiAfk } })}
            />
            <Row
              label="Skip the AFK channel"
              hint="Members moved to the server's AFK channel earn no voice XP."
              checked={voice.ignoreAfkChannel}
              onChange={(ignoreAfkChannel) => set({ voice: { ...voice, ignoreAfkChannel } })}
            />
          </div>
        </Row>
      </Card>

      <Card title="XP multipliers" desc="Give certain roles a boost — perfect for boosters or premium members.">
        <MultipliersEditor value={value.multipliers} onChange={(multipliers) => set({ multipliers })} />
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

function MultipliersEditor({ value, onChange }: { value: XpMultiplier[]; onChange: (m: XpMultiplier[]) => void }) {
  const add = () => onChange([...value, { id: uid(), roleId: '', multiplier: 2 }]);
  const patch = (id: string, p: Partial<XpMultiplier>) => onChange(value.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const remove = (id: string) => onChange(value.filter((m) => m.id !== id));
  const clampMult = (n: number) => Math.min(10, Math.max(1, Math.round((Number.isFinite(n) ? n : 1) * 10) / 10));

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-xs text-mist-muted">No multipliers yet — everyone earns the base rate.</p>}
      {value.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3 text-sm text-mist-muted">
          <div className="min-w-[12rem] flex-1">
            <RoleSelect value={m.roleId} onChange={(roleId) => patch(m.id, { roleId })} placeholder="Pick a role" />
          </div>
          <span>earns</span>
          <input
            type="number"
            className="input w-20 py-1 text-center text-sm"
            value={m.multiplier}
            min={1}
            max={10}
            step={0.5}
            onChange={(e) => patch(m.id, { multiplier: clampMult(parseFloat(e.target.value)) })}
          />
          <span>× XP</span>
          <button type="button" onClick={() => remove(m.id)} className="text-mist-faint hover:text-red-300">
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-ghost text-sm">
        + Add multiplier
      </button>
    </div>
  );
}
