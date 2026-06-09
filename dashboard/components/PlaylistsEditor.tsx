'use client';

import { Card, Row, StatRow, NumInput } from './settingsKit';
import type { PlaylistsSettings } from '@/lib/settings';

export function PlaylistsEditor({ value, onChange }: { value: PlaylistsSettings; onChange: (p: PlaylistsSettings) => void }) {
  const set = (patch: Partial<PlaylistsSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <Card title="Saved playlists" desc="Members save the current queue as a named playlist and load it later.">
        <Row
          label="DJ-only management"
          hint="Only DJ roles can save or delete playlists (loading stays open to everyone)."
          checked={value.djOnly}
          onChange={(djOnly) => set({ djOnly })}
        />
        <StatRow>
          <span className="text-mist">Max playlists per server</span>
          <NumInput value={value.maxPerGuild} min={1} max={200} width="w-24" onChange={(maxPerGuild) => set({ maxPerGuild })} />
        </StatRow>
      </Card>

      <Card title="How it works">
        <p className="text-sm text-mist-muted">
          With a queue playing, members run <span className="font-mono text-accent-soft">/playlist save name:&lt;name&gt;</span> to
          store it, then <span className="font-mono text-accent-soft">/playlist load name:&lt;name&gt;</span> to queue it back up.{' '}
          <span className="font-mono text-accent-soft">/playlist list</span> and{' '}
          <span className="font-mono text-accent-soft">/playlist delete</span> manage them.
        </p>
      </Card>
    </div>
  );
}
