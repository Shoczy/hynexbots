'use client';

import { Card, StatRow, NumInput, TextField, ChannelField } from './settingsKit';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { StarboardSettings } from '@/lib/settings';

export function StarboardEditor({ value, onChange }: { value: StarboardSettings; onChange: (s: StarboardSettings) => void }) {
  const set = (patch: Partial<StarboardSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <Card
        title="Starboard"
        desc="When a message gets enough reactions, it's reposted to a highlights channel — and the count keeps updating live."
      >
        <ChannelField
          label="Starboard channel"
          hint="Where highlighted messages are posted."
          types={CHANNEL_TYPES.text}
          value={value.channelId}
          onChange={(channelId) => set({ channelId })}
        />
        <div className="flex flex-wrap items-end gap-4">
          <TextField
            label="Emoji"
            hint="The reaction that counts. Default ⭐ — or paste a custom server emoji."
            value={value.emoji}
            maxLength={64}
            onChange={(emoji) => set({ emoji })}
          />
          <StatRow>
            <span className="text-mist">Required reactions</span>
            <NumInput value={value.threshold} min={1} max={100} onChange={(threshold) => set({ threshold })} />
            <span>to feature it</span>
          </StatRow>
        </div>
      </Card>
    </div>
  );
}
