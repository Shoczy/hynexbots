'use client';

import { useState } from 'react';
import { Toggle } from './ui';
import { RolePicker as GuildRolePicker } from './settingsKit';
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
  balance: '1,250',
  amount: '250',
  streak: '4',
  currency: 'coins',
  symbol: '🪙',
  result: 'won',
  title: 'Daft Punk — Get Lucky',
  url: '#',
  requester: '@SomeUser',
  volume: '80',
  filter: 'bassboost',
  latency: '42',
};

const fillSample = (s: string) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => SAMPLE[k] ?? `{${k}}`);

function EmbedPreview({ embed, botName }: { embed: CommandEmbed; botName: string }) {
  const empty = !embed.title && !embed.description && !embed.footer;
  return (
    <div className="rounded-xl border border-ink-700 bg-[#313338] p-3">
      <span className="text-[10px] uppercase tracking-wide text-mist-faint">Preview</span>
      <div className="mt-2 flex gap-3 text-sm">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/30 text-base">🤖</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{botName || 'Your Bot'}</span>
            <span className="rounded bg-accent px-1.5 text-[10px] font-semibold text-white">APP</span>
          </div>
          {empty ? (
            <p className="mt-1 italic text-[#6d7178]">Type a title or description to preview your embed…</p>
          ) : (
            <div className="mt-1 max-w-md overflow-hidden rounded border-l-4 bg-[#2b2d31]" style={{ borderColor: embed.color || '#6366f1' }}>
              <div className="p-3">
                {embed.title && <p className="font-semibold text-white">{fillSample(embed.title)}</p>}
                {embed.description && <p className="mt-1 whitespace-pre-wrap break-words text-[#dbdee1]">{fillSample(embed.description)}</p>}
                {embed.footer && <p className="mt-2 text-xs text-[#949ba4]">{fillSample(embed.footer)}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

  // Append a {variable} to the description when its chip is clicked.
  const insertVar = (v: string) => onChange({ description: `${e.description}${e.description ? ' ' : ''}{${v}}` });

  return (
    <div className="mt-3 rounded-xl border border-ink-700 bg-ink-900/40 p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-medium text-mist">
          Custom reply embed{' '}
          {e.enabled && <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">on</span>}
        </span>
        <span className="text-xs text-mist-faint">{open ? 'Hide' : 'Edit'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <Toggle
            label="Use a custom reply for this command"
            hint="When on, the bot sends your embed instead of its default."
            checked={e.enabled}
            onChange={onToggle}
          />

          <div className={e.enabled ? 'space-y-3' : 'pointer-events-none space-y-3 opacity-50'}>
            <input
              className="input text-sm"
              placeholder="Embed title"
              maxLength={256}
              value={e.title}
              onChange={(ev) => onChange({ title: ev.target.value })}
            />
            <textarea
              className="input min-h-[80px] text-sm"
              placeholder="Embed description — use variables below, e.g. Hey {user}, your balance is {balance} {currency}."
              maxLength={4000}
              value={e.description}
              onChange={(ev) => onChange({ description: ev.target.value })}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-mist-faint">Color</span>
              <input
                type="color"
                className="h-8 w-10 cursor-pointer rounded-md border border-ink-600 bg-ink-900"
                value={e.color || '#6366f1'}
                onChange={(ev) => onChange({ color: ev.target.value })}
              />
              <input
                className="input w-28 font-mono text-xs"
                placeholder="#6366f1"
                value={e.color}
                onChange={(ev) => onChange({ color: ev.target.value })}
              />
              <input
                className="input flex-1 text-sm"
                placeholder="Footer (optional)"
                maxLength={2048}
                value={e.footer}
                onChange={(ev) => onChange({ footer: ev.target.value })}
              />
            </div>

            {vars.length > 0 && (
              <div>
                <span className="text-xs text-mist-faint">Variables (click to insert)</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {vars.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className="rounded-md border border-ink-600 bg-ink-800 px-2 py-1 font-mono text-[11px] text-mist-muted transition-colors hover:border-accent/50 hover:text-mist"
                    >
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <EmbedPreview embed={e} botName={botName} />
          </div>
        </div>
      )}
    </div>
  );
}
