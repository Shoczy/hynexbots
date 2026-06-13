'use client';

import { Card, Row, RolesField } from './settingsKit';
import type { GiveawaySettings } from '@/lib/settings';

export function GiveawaysEditor({ value, onChange }: { value: GiveawaySettings; onChange: (g: GiveawaySettings) => void }) {
  const set = (patch: Partial<GiveawaySettings>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <Card title="Giveaways" desc="Run timed giveaways members enter with a 🎉 button — winners are drawn automatically.">
        <RolesField
          label="Manager roles"
          hint="Roles allowed to start, end and reroll giveaways. Members with Manage Server can always do this."
          value={value.managerRoleIds}
          onChange={(managerRoleIds) => set({ managerRoleIds })}
        />
        <Row
          label="DM winners"
          hint="Send each winner a direct message when they win, in addition to the announcement in the channel."
          checked={value.dmWinners}
          onChange={(dmWinners) => set({ dmWinners })}
        />
      </Card>

      <Card title="How it works" desc="Giveaways are run with slash commands — no setup needed beyond turning the module on.">
        <div className="space-y-2 text-sm text-mist-muted">
          <p>
            <span className="font-mono text-accent-soft">/giveaway start</span> · duration (e.g. <span className="font-mono">1h</span>), number of winners, and the prize. Posts a 🎉 button members click to enter.
          </p>
          <p>
            <span className="font-mono text-accent-soft">/giveaway end</span> · end early and draw now (by message ID).
          </p>
          <p>
            <span className="font-mono text-accent-soft">/giveaway reroll</span> · draw fresh winners for a giveaway (by message ID).
          </p>
        </div>
      </Card>
    </div>
  );
}
