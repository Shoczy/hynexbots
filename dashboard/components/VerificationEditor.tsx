'use client';

import { Card, TextField, ChannelField, RoleField } from './settingsKit';
import { BlockBuilder } from './BlockBuilder';
import { SendAction } from './SendAction';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import { emptyV2Message, fromLegacy } from '@/lib/blocks';
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
  const v2 = value.v2 ?? emptyV2Message();
  // Block builder is the only panel-content editor. Seed it from the legacy
  // title/description while it's empty so existing panels aren't lost.
  const display = v2.blocks.length
    ? v2
    : fromLegacy({ enabled: true, accent: accent || '', title: value.title, description: value.description });
  const verifyButton = { label: value.buttonLabel || 'Verify', emoji: '✅', style: 'success' as const };

  return (
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
        <TextField label="Button label" value={value.buttonLabel} maxLength={80} onChange={(buttonLabel) => set({ buttonLabel })} />
        <TextField
          label="Success message"
          hint="Sent privately to the member once they verify."
          value={value.successMessage}
          maxLength={1000}
          onChange={(successMessage) => set({ successMessage })}
        />
      </Card>

      <Card title="Panel content" desc="The message members see before they verify. The Verify button is always added at the end.">
        <BlockBuilder
          value={display}
          onChange={(next) => set({ v2: next })}
          botName={botName}
          accent={accent}
          extraButtons={[verifyButton]}
        />
      </Card>

      {appId && (
        <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
          <p className="text-sm font-medium text-mist">Publish the panel</p>
          <p className="mt-0.5 mb-3 text-xs text-mist-muted">Posts it to the verification channel — no slash command needed. Save your changes first.</p>
          <SendAction appId={appId} action="post_verify_panel" label="Post the verify panel now" />
        </div>
      )}
    </div>
  );
}
