'use client';

import { Card, Row, StatRow, NumInput, RolesField } from './settingsKit';
import type { MusicSettings } from '@/lib/settings';

export function MusicEditor({ value, onChange }: { value: MusicSettings; onChange: (m: MusicSettings) => void }) {
  const set = (patch: Partial<MusicSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <Card title="Playback" desc="Defaults for the player and queue.">
        <StatRow>
          <span className="text-mist">Default volume</span>
          <NumInput value={value.defaultVolume} min={0} max={200} onChange={(defaultVolume) => set({ defaultVolume })} />
          <span>% (100 = normal)</span>
        </StatRow>
        <StatRow>
          <span className="text-mist">Max queue length</span>
          <NumInput value={value.maxQueueLength} min={1} max={1000} width="w-24" onChange={(maxQueueLength) => set({ maxQueueLength })} />
          <span>tracks</span>
        </StatRow>
        <StatRow>
          <span className="text-mist">Max track length</span>
          <NumInput value={value.maxTrackMinutes} min={0} max={1440} width="w-24" onChange={(maxTrackMinutes) => set({ maxTrackMinutes })} />
          <span>minutes (0 = no limit)</span>
        </StatRow>
        <StatRow>
          <span className="text-mist">Auto-leave when empty after</span>
          <NumInput value={value.autoLeaveSec} min={0} max={3600} width="w-24" onChange={(autoLeaveSec) => set({ autoLeaveSec })} />
          <span>seconds (0 = never)</span>
        </StatRow>
        <Row label="24/7 mode" hint="Stay connected even when the channel is empty — never auto-leave." checked={value.stay247} onChange={(stay247) => set({ stay247 })} />
      </Card>

      <Card title="DJ permissions" desc="Restrict who can control playback.">
        <Row label="DJ-only controls" hint="Only DJ roles can skip, stop, and manage the queue." checked={value.djOnly} onChange={(djOnly) => set({ djOnly })} />
        <RolesField label="DJ roles" hint="Members with these roles get full player control." value={value.djRoleIds} onChange={(djRoleIds) => set({ djRoleIds })} />
        <Row
          label="Vote-skip"
          hint="Let listeners vote to skip the current track."
          checked={value.voteSkip.enabled}
          onChange={(enabled) => set({ voteSkip: { ...value.voteSkip, enabled } })}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
            <span>Skip at</span>
            <NumInput value={value.voteSkip.percent} min={1} max={100} onChange={(percent) => set({ voteSkip: { ...value.voteSkip, percent } })} />
            <span>% of listeners</span>
          </div>
        </Row>
      </Card>

      <Card title="Features">
        <Row label="Audio filters" hint="Allow bassboost, nightcore and other effects." checked={value.allowFilters} onChange={(allowFilters) => set({ allowFilters })} />
        <Row label="Announce now-playing" hint="Post a message when a new track starts." checked={value.announceNowPlaying} onChange={(announceNowPlaying) => set({ announceNowPlaying })} />
      </Card>
    </div>
  );
}
