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

            <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
              <Row
                label="Self-serve applications"
                hint="Members apply with a button; staff approve or deny. Approving grants the whitelist role and saves their identifier automatically."
                checked={value.whitelist.application.enabled}
                onChange={(v) => set('whitelist', { application: { ...value.whitelist.application, enabled: v } })}
              >
                <div className="space-y-3">
                  <ChannelField
                    label="Apply panel channel"
                    hint="Where the public “Apply for whitelist” button is posted."
                    value={value.whitelist.application.panelChannelId}
                    onChange={(v) => set('whitelist', { application: { ...value.whitelist.application, panelChannelId: v } })}
                    types={CHANNEL_TYPES.text}
                  />
                  <ChannelField
                    label="Review channel (staff)"
                    hint="Where submitted applications appear for staff to approve or deny."
                    value={value.whitelist.application.reviewChannelId}
                    onChange={(v) => set('whitelist', { application: { ...value.whitelist.application, reviewChannelId: v } })}
                    types={CHANNEL_TYPES.text}
                  />
                  {appId && (
                    <SendAction
                      appId={appId}
                      action="fivem_post_whitelist_panel"
                      label="Post the apply panel now"
                      hint="Posts the “Apply for whitelist” panel to the channel above. Save changes first."
                    />
                  )}
                </div>
              </Row>
            </div>
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

        <Row
          label="Server down alerts"
          hint="Pings a role when your server goes offline and posts again when it recovers."
          checked={value.monitor.enabled}
          onChange={(v) => set('monitor', { enabled: v })}
        >
          <div className="space-y-3">
            <ChannelField
              label="Alert channel"
              hint="Where the offline / recovery alerts are posted."
              value={value.monitor.channelId}
              onChange={(v) => set('monitor', { channelId: v })}
              types={CHANNEL_TYPES.text}
            />
            <RoleField
              label="Ping role (optional)"
              hint="This role is pinged when the server goes down."
              value={value.monitor.pingRoleId}
              onChange={(v) => set('monitor', { pingRoleId: v })}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
              <span>Alert after</span>
              <NumInput value={value.monitor.downChecks} min={1} max={10} onChange={(n) => set('monitor', { downChecks: n })} />
              <span>failed checks in a row (one check per minute)</span>
            </div>
          </div>
        </Row>

        <Row
          label="Playtime tracking"
          hint="Tracks how long each player is on the server for a /playtime leaderboard. No in-game setup needed."
          checked={value.playtime.enabled}
          onChange={(v) => set('playtime', { enabled: v })}
        >
          <p className="text-xs text-mist-muted">
            While on, the bot checks who&apos;s online every minute and adds up their time. Players use{' '}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px]">/playtime</code> and{' '}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px]">/playtime-top</code>.
          </p>
        </Row>

        <Row
          label="In-game ↔ Discord chat bridge"
          hint="Relays chat both ways between your server and a Discord channel. Requires the Hynex in-game resource (provided)."
          checked={value.chatBridge.enabled}
          onChange={(v) => set('chatBridge', { enabled: v })}
        >
          <div className="space-y-3">
            <ChannelField
              label="Bridge channel"
              hint="In-game chat appears here, and messages sent here appear in-game."
              value={value.chatBridge.channelId}
              onChange={(v) => set('chatBridge', { channelId: v })}
              types={CHANNEL_TYPES.text}
            />
            <p className="text-xs text-mist-muted">
              Drop the <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px]">hynex_chat</code> resource onto your server and set its
              intake URL + secret. Setup steps are in the resource README.
            </p>
          </div>
        </Row>
      </Card>
    </div>
  );
}
