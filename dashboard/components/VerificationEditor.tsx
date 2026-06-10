'use client';

import { Card, TextField, ChannelField, RoleField } from './settingsKit';
import { EmbedPreview } from './EmbedPreview';
import { SendAction } from './SendAction';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { VerificationSettings } from '@/lib/settings';

export function VerificationEditor({
  value,
  onChange,
  accent,
  botName,
  appId,
}: {
  value: VerificationSettings;
  onChange: (v: VerificationSettings) => void;
  accent?: string;
  botName?: string;
  appId?: string;
}) {
  const set = (patch: Partial<VerificationSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      {/* Left: settings */}
      <div className="space-y-5">
        <Card title="Gate setup" desc="Where the verify button lives and what role it grants.">
          <ChannelField
            label="Verification channel"
            hint="Where the panel is posted."
            types={CHANNEL_TYPES.text}
            value={value.channelId}
            onChange={(channelId) => set({ channelId })}
          />
          <RoleField
            label="Verified role"
            hint="Granted when a member clicks Verify. Lock everything else behind this role."
            value={value.roleId}
            onChange={(roleId) => set({ roleId })}
          />
        </Card>

        <Card title="Panel content" desc="The message members see before they verify.">
          <TextField label="Title" value={value.title} maxLength={256} onChange={(title) => set({ title })} />
          <div>
            <span className="label">Description</span>
            <textarea
              className="input mt-1 min-h-[80px] resize-y"
              value={value.description}
              maxLength={2000}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>
          <TextField label="Button label" value={value.buttonLabel} maxLength={80} onChange={(buttonLabel) => set({ buttonLabel })} />
          <TextField
            label="Success message"
            hint="Sent privately to the member once they verify."
            value={value.successMessage}
            maxLength={1000}
            onChange={(successMessage) => set({ successMessage })}
          />
        </Card>
      </div>

      {/* Right: live preview + publish */}
      <div className="space-y-4 lg:sticky lg:top-24">
        <div>
          <p className="label mb-2">Live preview</p>
          <EmbedPreview
            botName={botName}
            accent={accent}
            title={value.title || 'Verify to continue'}
            description={value.description || 'Click the button below to unlock the server.'}
            footer="Hynex Bots"
            buttons={[{ label: value.buttonLabel || 'Verify', emoji: '✅', style: 'success' }]}
          />
        </div>
        {appId && (
          <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
            <p className="text-sm font-medium text-mist">Publish the panel</p>
            <p className="mt-0.5 mb-3 text-xs text-mist-muted">Posts it to the verification channel — no slash command needed. Save your changes first.</p>
            <SendAction appId={appId} action="post_verify_panel" label="Post the verify panel now" />
          </div>
        )}
      </div>
    </div>
  );
}
