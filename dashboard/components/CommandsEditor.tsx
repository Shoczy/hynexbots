'use client';

import { useState } from 'react';
import { Toggle } from './ui';
import { RolePicker as GuildRolePicker } from './settingsKit';
import { BlockBuilder } from './BlockBuilder';
import { emptyV2Message } from '@/lib/blocks';
import {
  COMMAND_GROUPS,
  COMMAND_VARIABLES,
  emptyCommandEmbed,
  type Settings,
  type CommandPerm,
  type CommandEmbed,
} from '@/lib/settings';

type Commands = Settings['commands'];

const DEFAULT_PERM: CommandPerm = { enabled: true, roles: [] };

export function CommandsEditor({
  value,
  modules,
  onChange,
  groups,
  modulesLocked = false,
  botName = 'Your Bot',
}: {
  value: Commands;
  modules: Record<string, boolean>;
  onChange: (c: Commands) => void;
  /** Allowed command-group ids for this bot's product. Omit to show all. */
  groups?: string[];
  /** Single-system products have no Modules tab — their module is always on. */
  modulesLocked?: boolean;
  /** Shown in the embed preview. */
  botName?: string;
}) {
  const get = (name: string): CommandPerm => value[name] ?? DEFAULT_PERM;
  const set = (name: string, patch: Partial<CommandPerm>) =>
    onChange({ ...value, [name]: { ...get(name), ...patch } });
  const setEmbed = (name: string, patch: Partial<CommandEmbed>) => {
    const cur = get(name).embed ?? emptyCommandEmbed();
    set(name, { embed: { ...cur, ...patch } });
  };

  const visibleGroups = groups ? COMMAND_GROUPS.filter((g) => groups.includes(g.module)) : COMMAND_GROUPS;

  return (
    <div className="space-y-5">
      <p className="text-sm text-mist-muted">
        Enable or disable each command, restrict who can use it, and write a custom reply. Leave roles empty to allow{' '}
        <span className="text-mist">everyone</span>.
      </p>

      {visibleGroups.map((group) => {
        // `utility` has no module toggle; locked products are always on.
        const moduleOn = modulesLocked || group.module === 'utility' || modules[group.module] !== false;
        return (
          <section key={group.module} className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{group.label}</h3>
              {!moduleOn && (
                <span className="rounded-full border border-ink-600 px-2.5 py-1 text-[11px] text-mist-faint">
                  module off
                </span>
              )}
            </div>

            <div className="mt-4 divide-y divide-ink-700">
              {group.commands.map((cmd) => {
                const perm = get(cmd);
                return (
                  <div key={cmd} className={`py-3.5 ${moduleOn ? '' : 'opacity-50'}`}>
                    <div className="flex items-center justify-between gap-4">
                      <code className="rounded-md bg-ink-800 px-2 py-1 font-mono text-sm text-mist">/{cmd}</code>
                      <Toggle label="" checked={perm.enabled} onChange={(v) => set(cmd, { enabled: v })} />
                    </div>
                    {perm.enabled && (
                      <>
                        <RolePicker roles={perm.roles} onChange={(roles) => set(cmd, { roles })} />
                        <CommandEmbedEditor
                          cmd={cmd}
                          value={perm.embed}
                          botName={botName}
                          onToggle={(enabled) => setEmbed(cmd, { enabled })}
                          onChange={(patch) => setEmbed(cmd, patch)}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RolePicker({ roles, onChange }: { roles: string[]; onChange: (r: string[]) => void }) {
  return (
    <div className="mt-3">
      <span className="text-xs text-mist-faint">
        Allowed roles <span className="text-mist-muted">(none = everyone)</span>
      </span>
      <div className="mt-1.5">
        <GuildRolePicker value={roles} onChange={onChange} />
      </div>
    </div>
  );
}

// Sample values so the live preview reads naturally.
const SAMPLE: Record<string, string> = {
  user: '@SomeUser',
  target: '@OtherUser',
  moderator: '@Staff',
  server: 'Your Server',
  channel: '#general',
  reason: 'Breaking the rules',
  duration: '10m',
  count: '3',
  players: '42',
  maxPlayers: '64',
  hostname: 'My Server',
  minutes: '5',
  latency: '42',
};

function CommandEmbedEditor({
  cmd,
  value,
  botName,
  onToggle,
  onChange,
}: {
  cmd: string;
  value?: CommandEmbed;
  botName: string;
  onToggle: (enabled: boolean) => void;
  onChange: (patch: Partial<CommandEmbed>) => void;
}) {
  const e = value ?? emptyCommandEmbed();
  const [open, setOpen] = useState(e.enabled);
  const vars = COMMAND_VARIABLES[cmd] ?? [];
  const v2 = e.v2 ?? emptyV2Message();

  return (
    <div className="mt-3 rounded-xl border border-ink-700 bg-ink-900/40 p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-medium text-mist">
          Custom reply{' '}
          {e.enabled && <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">on</span>}
        </span>
        <span className="text-xs text-mist-faint">{open ? 'Hide' : 'Edit'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <Toggle
            label="Use a custom reply for this command"
            hint="When on, the bot sends your designed message instead of its default."
            checked={e.enabled}
            onChange={onToggle}
          />

          <div className={e.enabled ? '' : 'pointer-events-none opacity-50'}>
            <BlockBuilder
              value={v2}
              onChange={(next) => onChange({ v2: next })}
              botName={botName}
              variables={vars}
              sample={SAMPLE}
            />
          </div>
        </div>
      )}
    </div>
  );
}
