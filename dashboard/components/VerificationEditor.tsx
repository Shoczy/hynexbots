'use client';

import { Card, TextField, ChannelField, RoleField } from './settingsKit';
import { EmbedPreview } from './EmbedPreview';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { VerificationSettings } from '@/lib/settings';

export function VerificationEditor({
  value,
  onChange,
  accent,
  botName,
}: {
  value: VerificationSettings;
  onChange: (v: VerificationSettings) => void;
  accent?: string;
  botName?: string;
}) {
  const set = (patch: Partial<VerificationSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <Card title="Gate setup" desc="Where the verify button lives and what role it grants.">
        <ChannelField
          label="Verification channel"
          hint="Where the verification panel is posted. Run /verify-panel there to publish it."
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

      <Card title="Preview" desc="How the verification panel will look in Discord.">
        <EmbedPreview
          botName={botName}
          accent={accent}
          title={value.title}
          description={value.description}
          buttons={[{ label: value.buttonLabel || 'Verify', emoji: '✅', style: 'success' }]}
        />
      </Card>
    </div>
  );
}
