'use client';

import { Card, TextField, ChannelField, RoleField } from './settingsKit';
import { EmbedPreview } from './EmbedPreview';
import { BlockBuilder } from './BlockBuilder';
import { SendAction } from './SendAction';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import { emptyV2Message } from '@/lib/blocks';
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
          value={v2}
          onChange={(next) => set({ v2: next })}
          botName={botName}
          accent={accent}
          extraButtons={[verifyButton]}
          toggleLabel="Design the panel with blocks (Components V2)"
          toggleHint="Stack text, separators, images and link buttons. When off, the simple title + description below is used."
        />

        {!v2.enabled && (
          <div className="grid gap-6 border-t border-ink-700/60 pt-5 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="space-y-4">
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
            </div>
            <div className="lg:sticky lg:top-24">
              <p className="label mb-2">Live preview</p>
              <EmbedPreview
                botName={botName}
                accent={accent}
                title={value.title || 'Verify to continue'}
                description={value.description || 'Click the button below to unlock the server.'}
                footer="Hynex Bots"
                buttons={[verifyButton]}
              />
            </div>
          </div>
        )}
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
