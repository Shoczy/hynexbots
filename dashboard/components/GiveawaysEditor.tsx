'use client';

import { Card, RolesField, RoleField } from './settingsKit';
import type { GiveawaysSettings } from '@/lib/settings';

export function GiveawaysEditor({ value, onChange }: { value: GiveawaysSettings; onChange: (g: GiveawaysSettings) => void }) {
  const set = (patch: Partial<GiveawaysSettings>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <Card title="Who can run giveaways" desc="Admins can always manage giveaways. Add roles for your events team.">
        <RolesField
          label="Manager roles"
          hint="Members with these roles can start, end and reroll giveaways via /giveaway."
          value={value.managerRoleIds}
          onChange={(managerRoleIds) => set({ managerRoleIds })}
        />
      </Card>

      <Card title="Entry" desc="Optionally gate entry behind a role (can be overridden per giveaway).">
        <RoleField
          label="Default required role"
          hint="Leave empty to let everyone enter by default."
          value={value.requireRoleId}
          onChange={(requireRoleId) => set({ requireRoleId })}
        />
      </Card>

      <Card title="How it works">
        <p className="text-sm text-mist-muted">
          Run <span className="font-mono text-accent-soft">/giveaway start</span> in your server with a prize, duration (e.g.{' '}
          <span className="font-mono">1h</span>, <span className="font-mono">2d</span>) and number of winners. Members enter with a
          button; winners are drawn automatically when it ends. Use{' '}
          <span className="font-mono text-accent-soft">/giveaway reroll</span> or{' '}
          <span className="font-mono text-accent-soft">/giveaway end</span> to manage active ones.
        </p>
      </Card>
    </div>
  );
}
