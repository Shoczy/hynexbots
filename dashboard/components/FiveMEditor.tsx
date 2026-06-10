'use client';

import type { FiveMSettings } from '@/lib/settings';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import { Card, Row, TextField, NumInput, ChannelField, RoleField, ChipInput } from './settingsKit';
import { SendAction } from './SendAction';

/**
 * Editor for the FiveM bot. Four self-contained systems, each behind its own
 * enable toggle so a customer turns on only what their server runs:
 *   live status embed · role whitelist · in-game reports · restart announcements.
 */
export function FiveMEditor({
  value,
  onChange,
  appId,
}: {
  value: FiveMSettings;
  onChange: (v: FiveMSettings) => void;
  appId?: string;
}) {
  const set = <K extends keyof FiveMSettings>(key: K, patch: Partial<FiveMSettings[K]>) =>
    onChange({ ...value, [key]: { ...value[key], ...patch } });

  return (
    <div className="space-y-5">
      <Card title="FiveM server" desc="Where your server lives. Used by the status embed and the /status & /players commands.">
        <TextField
          label="Server address"
          hint="Your FiveM server's IP and port, e.g. 51.83.12.34:30120 — or a domain like play.example.com."
          value={value.server.host}
          onChange={(v) => set('server', { host: v })}
          placeholder="51.83.12.34:30120"
          mono
        />
        <TextField
          label="Display name (optional)"
          hint="Overrides the name shown in embeds. Leave blank to use the server's own hostname."
          value={value.server.name}
          onChange={(v) => set('server', { name: v })}
          placeholder="My Roleplay Server"
          maxLength={80}
        />
      </Card>

      <Card title="Modules" desc="Toggle each system on or off. Open one to configure it.">
        <Row
          label="Live server status"
          hint="Posts an auto-updating embed with the live player count and status."
          checked={value.status.enabled}
          onChange={(v) => set('status', { enabled: v })}
        >
          <div className="space-y-3">
            <ChannelField
              label="Status channel"
              hint="The embed is posted here and edited in place on every refresh."
              value={value.status.channelId}
              onChange={(v) => set('status', { channelId: v })}
              types={CHANNEL_TYPES.text}
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-mist-muted">Refresh every</span>
              <NumInput value={value.status.refreshSec} onChange={(n) => set('status', { refreshSec: n })} min={30} max={600} />
              <span className="text-sm text-mist-muted">seconds</span>
            </div>
            {appId && (
              <SendAction appId={appId} action="fivem_post_status" label="Post / refresh status now" hint="Posts the status embed to the channel above. Save changes first." />
            )}
          </div>
        </Row>

        <Row
          label="Whitelist"
          hint="Grant or revoke a whitelist role with /whitelist add|remove|list."
          checked={value.whitelist.enabled}
          onChange={(v) => set('whitelist', { enabled: v })}
        >
          <div className="space-y-3">
            <RoleField
              label="Whitelist role"
              hint="The role granted to whitelisted members."
              value={value.whitelist.roleId}
              onChange={(v) => set('whitelist', { roleId: v })}
            />
            <ChannelField
              label="Log channel (optional)"
              hint="Whitelist add/remove actions are logged here."
              value={value.whitelist.logChannelId}
              onChange={(v) => set('whitelist', { logChannelId: v })}
              types={CHANNEL_TYPES.text}
            />
          </div>
        </Row>

        <Row
          label="In-game reports"
          hint="Player /report calls from your server are forwarded to a Discord channel."
          checked={value.reports.enabled}
          onChange={(v) => set('reports', { enabled: v })}
        >
          <div className="space-y-3">
            <ChannelField
              label="Reports channel"
              hint="Incoming reports are posted here."
              value={value.reports.channelId}
              onChange={(v) => set('reports', { channelId: v })}
              types={CHANNEL_TYPES.text}
            />
            <RoleField
              label="Ping role (optional)"
              hint="This role is pinged when a new report comes in."
              value={value.reports.pingRoleId}
              onChange={(v) => set('reports', { pingRoleId: v })}
            />
          </div>
        </Row>

        <Row
          label="Restart announcements"
          hint="Scheduled restart times with countdown warnings."
          checked={value.restarts.enabled}
          onChange={(v) => set('restarts', { enabled: v })}
        >
          <div className="space-y-3">
            <ChannelField
              label="Announcement channel"
              value={value.restarts.channelId}
              onChange={(v) => set('restarts', { channelId: v })}
              types={CHANNEL_TYPES.text}
            />
            <div>
              <span className="label">Restart times</span>
              <p className="mb-2 mt-0.5 text-xs text-mist-muted">24-hour server time, e.g. 04:00. Add as many as you need.</p>
              <ChipInput
                items={value.restarts.times}
                onChange={(times) => set('restarts', { times })}
                placeholder="04:00"
                mono
                transform={(s) => s.trim()}
                validate={(s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s)}
              />
            </div>
            <div>
              <span className="label">Warning countdown (minutes)</span>
              <p className="mb-2 mt-0.5 text-xs text-mist-muted">How many minutes before each restart to warn, e.g. 15, 5, 1.</p>
              <ChipInput
                items={value.restarts.warnMinutes.map(String)}
                onChange={(items) =>
                  set('restarts', {
                    warnMinutes: [...new Set(items.map((x) => parseInt(x, 10)).filter((n) => n > 0 && n <= 120))].sort((a, b) => b - a),
                  })
                }
                placeholder="5"
                mono
                transform={(s) => s.replace(/\D/g, '')}
                validate={(s) => /^\d{1,3}$/.test(s) && +s > 0 && +s <= 120}
              />
            </div>
            {appId && (
              <div className="flex flex-wrap gap-2 border-t border-ink-700/60 pt-3">
                <SendAction appId={appId} action="fivem_announce_restart" payload={{ minutes: 5 }} label="Announce restart in 5 min" />
                <SendAction appId={appId} action="fivem_announce_restart" payload={{ minutes: 0 }} label="Announce restart now" />
              </div>
            )}
          </div>
        </Row>
      </Card>
    </div>
  );
}
