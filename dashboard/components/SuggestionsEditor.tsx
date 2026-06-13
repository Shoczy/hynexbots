'use client';

import { Card, Row, ChannelField, RolesField } from './settingsKit';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { SuggestionSettings } from '@/lib/settings';

export function SuggestionsEditor({ value, onChange }: { value: SuggestionSettings; onChange: (s: SuggestionSettings) => void }) {
  const set = (patch: Partial<SuggestionSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <Card title="Suggestions" desc="Members submit ideas with /suggest; everyone votes 👍/👎 and staff approve or deny.">
        <ChannelField
          label="Suggestions channel"
          hint="Where submitted suggestions are posted for voting."
          types={CHANNEL_TYPES.text}
          value={value.channelId}
          onChange={(channelId) => set({ channelId })}
        />
        <RolesField
          label="Approver roles"
          hint="Roles allowed to approve or deny suggestions. Members with Manage Server always can."
          value={value.approverRoleIds}
          onChange={(approverRoleIds) => set({ approverRoleIds })}
        />
        <Row
          label="Anonymous suggestions"
          hint="Hide who submitted each suggestion. When off, the author's name is shown."
          checked={value.anonymous}
          onChange={(anonymous) => set({ anonymous })}
        />
      </Card>
    </div>
  );
}
