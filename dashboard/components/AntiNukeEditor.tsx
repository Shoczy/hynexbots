'use client';

import { Card, Row, NumInput, ChannelField, RolesField, ChipInput, Picker } from './settingsKit';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { AntiNukeSettings, NukeLimit } from '@/lib/settings';

const PUNISHMENTS = [
  { value: 'strip', label: 'Strip all roles (neutralize)' },
  { value: 'ban', label: 'Ban the offender' },
  { value: 'kick', label: 'Kick the offender' },
];

const LIMITS: { key: keyof AntiNukeSettings['limits']; label: string; hint: string }[] = [
  { key: 'channelDelete', label: 'Channel deletions', hint: 'Mass channel deletes.' },
  { key: 'roleDelete', label: 'Role deletions', hint: 'Mass role deletes.' },
  { key: 'ban', label: 'Bans', hint: 'Mass bans.' },
  { key: 'kick', label: 'Kicks', hint: 'Mass kicks.' },
];

export function AntiNukeEditor({ value, onChange }: { value: AntiNukeSettings; onChange: (a: AntiNukeSettings) => void }) {
  const set = (patch: Partial<AntiNukeSettings>) => onChange({ ...value, ...patch });
  const setLimit = (key: keyof AntiNukeSettings['limits'], patch: Partial<NukeLimit>) =>
    onChange({ ...value, limits: { ...value.limits, [key]: { ...value.limits[key], ...patch } } });

  return (
    <div className="space-y-5">
      <Card title="Response" desc="What happens to anyone who blows past a limit below.">
        <div>
          <span className="label">Punishment</span>
          <div className="mt-1 max-w-sm">
            <Picker value={value.punishment} onChange={(v) => set({ punishment: (v || 'strip') as AntiNukeSettings['punishment'] })} options={PUNISHMENTS} allowClear={false} searchable={false} />
          </div>
        </div>
        <ChannelField label="Alert channel" hint="Where anti-nuke warnings are posted (defaults to your mod log)." types={CHANNEL_TYPES.text} value={value.alertChannelId} onChange={(alertChannelId) => set({ alertChannelId })} />
      </Card>

      <Card title="Limits" desc="Trip the response when one person exceeds a threshold in the time window.">
        {LIMITS.map(({ key, label, hint }) => {
          const l = value.limits[key];
          return (
            <Row key={key} label={label} hint={hint} checked={l.enabled} onChange={(enabled) => setLimit(key, { enabled })}>
              <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
                <span>Max</span>
                <NumInput value={l.max} min={1} max={100} onChange={(max) => setLimit(key, { max })} />
                <span>within</span>
                <NumInput value={l.perSeconds} min={5} max={600} width="w-24" onChange={(perSeconds) => setLimit(key, { perSeconds })} />
                <span>seconds</span>
              </div>
            </Row>
          );
        })}
      </Card>

      <Card title="Exemptions" desc="Trusted people the limits never apply to. The server owner and the bot are always exempt.">
        <RolesField label="Whitelisted roles" value={value.whitelistRoleIds} onChange={(whitelistRoleIds) => set({ whitelistRoleIds })} />
        <div>
          <span className="label">Whitelisted user IDs</span>
          <div className="mt-1">
            <ChipInput
              items={value.whitelistUserIds}
              onChange={(whitelistUserIds) => set({ whitelistUserIds })}
              placeholder="Add user ID"
              mono
              transform={(s) => s.replace(/\D/g, '')}
              validate={(s) => /^\d{5,20}$/.test(s)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
