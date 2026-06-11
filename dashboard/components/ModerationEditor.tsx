'use client';

import { Card, Row, NumInput, ChipInput, RoleField, RolesField, ChannelField, uid } from './settingsKit';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { ModerationSettings, ModAction, WarnEscalation } from '@/lib/settings';

const ACTIONS: [ModAction, string][] = [
  ['timeout', 'Timeout'],
  ['mute', 'Mute'],
  ['kick', 'Kick'],
  ['ban', 'Ban'],
];

export function ModerationEditor({
  value,
  onChange,
}: {
  value: ModerationSettings;
  onChange: (m: ModerationSettings) => void;
}) {
  const am = value.automod;
  const ar = value.antiRaid;
  const wn = value.warnings;
  const lg = value.logging;
  const rl = value.roles;
  const asm = value.autoSlowmode;

  const setAutomod = (patch: Partial<ModerationSettings['automod']>) => onChange({ ...value, automod: { ...am, ...patch } });
  const setAutoSlowmode = (patch: Partial<ModerationSettings['autoSlowmode']>) => onChange({ ...value, autoSlowmode: { ...asm, ...patch } });
  const setAntiRaid = (patch: Partial<ModerationSettings['antiRaid']>) => onChange({ ...value, antiRaid: { ...ar, ...patch } });
  const setWarnings = (patch: Partial<ModerationSettings['warnings']>) => onChange({ ...value, warnings: { ...wn, ...patch } });
  const setLogging = (patch: Partial<ModerationSettings['logging']>) => onChange({ ...value, logging: { ...lg, ...patch } });
  const setRoles = (patch: Partial<ModerationSettings['roles']>) => onChange({ ...value, roles: { ...rl, ...patch } });

  return (
    <div className="space-y-5">
      {/* Auto-moderation */}
      <Card title="Auto-Moderation" desc="Automatically catch spam and unwanted content.">
        <Row label="Enable auto-moderation" hint="Master switch for the filters below." checked={am.enabled} onChange={(v) => setAutomod({ enabled: v })} />
        {am.enabled && (
          <>
            <Row
              label="Anti-spam"
              hint="Act when a member sends messages too quickly."
              checked={am.antiSpam.enabled}
              onChange={(v) => setAutomod({ antiSpam: { ...am.antiSpam, enabled: v } })}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
                <span>Max</span>
                <NumInput value={am.antiSpam.maxMessages} min={1} max={50} onChange={(n) => setAutomod({ antiSpam: { ...am.antiSpam, maxMessages: n } })} />
                <span>messages per</span>
                <NumInput value={am.antiSpam.intervalSec} min={1} max={60} onChange={(n) => setAutomod({ antiSpam: { ...am.antiSpam, intervalSec: n } })} />
                <span>seconds</span>
              </div>
            </Row>
            <Row label="Block invite links" hint="Delete Discord invites posted by non-staff." checked={am.antiInvites} onChange={(v) => setAutomod({ antiInvites: v })} />
            <Row label="Block external links" hint="Delete URLs posted by non-staff." checked={am.antiLinks} onChange={(v) => setAutomod({ antiLinks: v })} />
            <Row
              label="Mass-mention filter"
              hint="Act on messages with too many mentions."
              checked={am.massMention.enabled}
              onChange={(v) => setAutomod({ massMention: { ...am.massMention, enabled: v } })}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
                <span>Trigger at</span>
                <NumInput value={am.massMention.threshold} min={1} max={50} onChange={(n) => setAutomod({ massMention: { ...am.massMention, threshold: n } })} />
                <span>mentions</span>
              </div>
            </Row>
            <Row
              label="Excessive caps"
              hint="Act on messages that are mostly uppercase."
              checked={am.capsFilter.enabled}
              onChange={(v) => setAutomod({ capsFilter: { ...am.capsFilter, enabled: v } })}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
                <span>Trigger above</span>
                <NumInput value={am.capsFilter.percent} min={1} max={100} onChange={(n) => setAutomod({ capsFilter: { ...am.capsFilter, percent: n } })} />
                <span>% caps</span>
              </div>
            </Row>
            <Row
              label="Banned words"
              hint="Delete messages containing these words."
              checked={am.bannedWords.enabled}
              onChange={(v) => setAutomod({ bannedWords: { ...am.bannedWords, enabled: v } })}
            >
              <ChipInput
                items={am.bannedWords.words}
                onChange={(words) => setAutomod({ bannedWords: { ...am.bannedWords, words } })}
                placeholder="Add a word"
                transform={(s) => s.trim().toLowerCase()}
                validate={(s) => s.length > 0 && s.length <= 100}
              />
            </Row>
            <Row
              label="Scam & phishing links"
              hint="Delete known fake-Nitro / account-steal links. A built-in blocklist runs automatically — add your own domains below."
              checked={am.scamLinks.enabled}
              onChange={(v) => setAutomod({ scamLinks: { ...am.scamLinks, enabled: v } })}
            >
              <ChipInput
                items={am.scamLinks.extraDomains}
                onChange={(extraDomains) => setAutomod({ scamLinks: { ...am.scamLinks, extraDomains } })}
                placeholder="extra domain, e.g. bad-site.com"
                transform={(s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
                validate={(s) => s.length > 0 && s.length <= 100}
              />
            </Row>
          </>
        )}
      </Card>

      {/* Auto-slowmode */}
      <Card title="Auto-Slowmode" desc="Automatically slow a channel down when it gets flooded, then lift it once it calms.">
        <Row label="Enable auto-slowmode" checked={asm.enabled} onChange={(v) => setAutoSlowmode({ enabled: v })}>
          <div className="space-y-3 text-sm text-mist-muted">
            <div className="flex flex-wrap items-center gap-2">
              <span>Trip at</span>
              <NumInput value={asm.messages} min={2} max={500} onChange={(n) => setAutoSlowmode({ messages: n })} />
              <span>messages per</span>
              <NumInput value={asm.perSeconds} min={1} max={300} onChange={(n) => setAutoSlowmode({ perSeconds: n })} />
              <span>seconds</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>Set slowmode to</span>
              <NumInput value={asm.slowmodeSeconds} min={1} max={21600} onChange={(n) => setAutoSlowmode({ slowmodeSeconds: n })} />
              <span>s, lift after</span>
              <NumInput value={asm.cooldownSeconds} min={5} max={3600} onChange={(n) => setAutoSlowmode({ cooldownSeconds: n })} />
              <span>s of calm</span>
            </div>
            <p className="text-xs text-mist-faint">Applies to every text channel. The channel&apos;s previous slowmode is restored afterwards.</p>
          </div>
        </Row>
      </Card>

      {/* Anti-raid */}
      <Card title="Anti-Raid" desc="Slow down coordinated joins and spam waves.">
        <Row label="Enable anti-raid" checked={ar.enabled} onChange={(v) => setAntiRaid({ enabled: v })} />
        {ar.enabled && (
          <>
            <div className="rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
                <span className="text-mist">Minimum account age</span>
                <NumInput value={ar.minAccountAgeDays} min={0} max={365} onChange={(n) => setAntiRaid({ minAccountAgeDays: n })} />
                <span>days (0 = off)</span>
              </div>
            </div>
            <Row
              label="Join-rate lockdown"
              hint="Lock the server when joins spike."
              checked={ar.joinRate.enabled}
              onChange={(v) => setAntiRaid({ joinRate: { ...ar.joinRate, enabled: v } })}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
                <span>Lock at</span>
                <NumInput value={ar.joinRate.joins} min={1} max={100} onChange={(n) => setAntiRaid({ joinRate: { ...ar.joinRate, joins: n } })} />
                <span>joins per</span>
                <NumInput value={ar.joinRate.perSeconds} min={1} max={300} onChange={(n) => setAntiRaid({ joinRate: { ...ar.joinRate, perSeconds: n } })} />
                <span>seconds</span>
              </div>
            </Row>
          </>
        )}
      </Card>

      {/* Warnings */}
      <Card title="Warnings" desc="Escalate automatically as members accumulate warnings.">
        <div className="rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
            <span className="text-mist">Warnings expire after</span>
            <NumInput value={wn.expireDays} min={0} max={365} onChange={(n) => setWarnings({ expireDays: n })} />
            <span>days (0 = never)</span>
          </div>
        </div>
        <EscalationsEditor value={wn.escalations} onChange={(escalations) => setWarnings({ escalations })} />
      </Card>

      {/* Logging */}
      <Card title="Logging" desc="Choose which events get posted to your log channel.">
        <ChannelField
          label="Log channel"
          hint="Where moderation events are posted."
          types={CHANNEL_TYPES.text}
          value={lg.channelId}
          onChange={(channelId) => setLogging({ channelId })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Member joins & leaves" checked={lg.events.memberJoinLeave} onChange={(v) => setLogging({ events: { ...lg.events, memberJoinLeave: v } })} />
          <Row label="Message deletions" checked={lg.events.messageDelete} onChange={(v) => setLogging({ events: { ...lg.events, messageDelete: v } })} />
          <Row label="Message edits" checked={lg.events.messageEdit} onChange={(v) => setLogging({ events: { ...lg.events, messageEdit: v } })} />
          <Row label="Bans & kicks" checked={lg.events.banKick} onChange={(v) => setLogging({ events: { ...lg.events, banKick: v } })} />
          <Row label="Role changes" checked={lg.events.roleChange} onChange={(v) => setLogging({ events: { ...lg.events, roleChange: v } })} />
          <Row label="Nickname changes" checked={lg.events.nicknameChange} onChange={(v) => setLogging({ events: { ...lg.events, nicknameChange: v } })} />
          <Row label="Voice joins & leaves" checked={lg.events.voiceJoinLeave} onChange={(v) => setLogging({ events: { ...lg.events, voiceJoinLeave: v } })} />
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications" desc="How the bot communicates moderation actions.">
        <Row
          label="DM members on action"
          hint="Send the member a DM with the reason when they're warned, muted, kicked or banned."
          checked={value.dmOnPunish}
          onChange={(dmOnPunish) => onChange({ ...value, dmOnPunish })}
        />
      </Card>

      {/* Roles */}
      <Card title="Mod roles & mute" desc="Roles the bot uses to enforce moderation.">
        <RoleField label="Mute role" hint="Applied when a member is muted." value={rl.muteRoleId} onChange={(muteRoleId) => setRoles({ muteRoleId })} />
        <RolesField
          label="Moderator roles"
          hint="Members with these roles bypass auto-mod and can run mod commands."
          value={rl.modRoleIds}
          onChange={(modRoleIds) => setRoles({ modRoleIds })}
        />
      </Card>
    </div>
  );
}

function EscalationsEditor({ value, onChange }: { value: WarnEscalation[]; onChange: (e: WarnEscalation[]) => void }) {
  const add = () => onChange([...value, { id: uid(), threshold: (value.at(-1)?.threshold ?? 0) + 1, action: 'mute' }]);
  const patch = (id: string, p: Partial<WarnEscalation>) => onChange(value.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const remove = (id: string) => onChange(value.filter((e) => e.id !== id));

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-xs text-mist-muted">No escalation rules — warnings are tracked but trigger no action.</p>}
      {value.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3 text-sm text-mist-muted">
          <span>At</span>
          <NumInput value={e.threshold} min={1} max={100} onChange={(n) => patch(e.id, { threshold: n })} />
          <span>warnings →</span>
          <select className="input w-32 py-1 text-sm" value={e.action} onChange={(ev) => patch(e.id, { action: ev.target.value as ModAction })}>
            {ACTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => remove(e.id)} className="ml-auto text-mist-faint hover:text-red-300">
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-ghost text-sm">
        + Add escalation
      </button>
    </div>
  );
}
