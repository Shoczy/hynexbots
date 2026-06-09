'use client';

import { useState } from 'react';
import { Field, Toggle } from './ui';
import { Card, RolesField } from './settingsKit';
import { DiscordPreview } from './DiscordPreview';
import { MATCH_MODES, VARIABLES, type Settings, type MessageBlock, type AutoResponse } from '@/lib/settings';

type Messages = Settings['messages'];

export function MessagesEditor({
  value,
  onChange,
  botName,
}: {
  value: Messages;
  onChange: (m: Messages) => void;
  botName: string;
}) {
  return (
    <div className="space-y-8">
      <VariableBar />

      <BlockEditor
        title="Welcome message"
        subtitle="Sent when a new member joins."
        block={value.welcome}
        botName={botName}
        onChange={(welcome) => onChange({ ...value, welcome })}
      />

      <BlockEditor
        title="Goodbye message"
        subtitle="Sent when a member leaves."
        block={value.leave}
        botName={botName}
        onChange={(leave) => onChange({ ...value, leave })}
      />

      <Autoresponders
        items={value.autoresponses}
        onChange={(autoresponses) => onChange({ ...value, autoresponses })}
      />

      <Card title="Auto-roles" desc="Roles automatically given to every member when they join.">
        <RolesField label="Roles on join" value={value.autoRoleIds} onChange={(autoRoleIds) => onChange({ ...value, autoRoleIds })} />
      </Card>
    </div>
  );
}

/* ── Variable helper ─────────────────────────────── */
function VariableBar() {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="card p-4">
      <p className="text-sm font-medium text-mist">Variables</p>
      <p className="mt-1 text-xs text-mist-muted">Click to copy, then paste into any text or embed field.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {VARIABLES.map((v) => (
          <button
            key={v.token}
            type="button"
            title={v.desc}
            onClick={() => {
              navigator.clipboard?.writeText(v.token);
              setCopied(v.token);
              setTimeout(() => setCopied((c) => (c === v.token ? null : c)), 1200);
            }}
            className="rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-1 font-mono text-xs text-accent-soft transition-colors hover:border-accent/50 hover:bg-accent/10"
          >
            {copied === v.token ? 'copied!' : v.token}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Welcome / Goodbye block ─────────────────────── */
function BlockEditor({
  title,
  subtitle,
  block,
  botName,
  onChange,
}: {
  title: string;
  subtitle: string;
  block: MessageBlock;
  botName: string;
  onChange: (b: MessageBlock) => void;
}) {
  const set = (patch: Partial<MessageBlock>) => onChange({ ...block, ...patch });
  const setEmbed = (patch: Partial<MessageBlock['embed']>) => onChange({ ...block, embed: { ...block.embed, ...patch } });

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <p className="mt-0.5 text-sm text-mist-muted">{subtitle}</p>
        </div>
        <Toggle label="" checked={block.enabled} onChange={(v) => set({ enabled: v })} />
      </div>

      {block.enabled && (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {/* Left: inputs */}
          <div className="space-y-4">
            <Field label="Channel ID" hint="Where this message is posted.">
              <input
                className="input font-mono"
                placeholder="123456789012345678"
                value={block.channelId}
                onChange={(e) => set({ channelId: e.target.value.replace(/\D/g, '') })}
              />
            </Field>
            <Field label="Message text" hint="Plain text sent above the embed. Supports variables.">
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="Welcome {user} to {server}! 🎉"
                value={block.text}
                onChange={(e) => set({ text: e.target.value })}
              />
            </Field>

            <div className="rounded-xl border border-ink-700 p-4">
              <Toggle label="Add an embed" checked={block.embed.enabled} onChange={(v) => setEmbed({ enabled: v })} />
              {block.embed.enabled && (
                <div className="mt-4 space-y-4">
                  <Field label="Title">
                    <input className="input" maxLength={256} value={block.embed.title} onChange={(e) => setEmbed({ title: e.target.value })} />
                  </Field>
                  <Field label="Description">
                    <textarea className="input min-h-[70px] resize-y" maxLength={4000} value={block.embed.description} onChange={(e) => setEmbed({ description: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Color">
                      <div className="flex items-center gap-2">
                        <input type="color" className="h-10 w-12 cursor-pointer rounded-lg border border-ink-600 bg-ink-900" value={block.embed.color} onChange={(e) => setEmbed({ color: e.target.value })} />
                        <input className="input font-mono" value={block.embed.color} onChange={(e) => setEmbed({ color: e.target.value })} />
                      </div>
                    </Field>
                    <Field label="Image URL">
                      <input className="input" placeholder="https://…" value={block.embed.image} onChange={(e) => setEmbed({ image: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Footer">
                    <input className="input" maxLength={2048} value={block.embed.footer} onChange={(e) => setEmbed({ footer: e.target.value })} />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* Right: preview */}
          <div>
            <p className="label">Live preview</p>
            <DiscordPreview block={block} botName={botName} />
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Autoresponders ──────────────────────────────── */
function Autoresponders({ items, onChange }: { items: AutoResponse[]; onChange: (x: AutoResponse[]) => void }) {
  const add = () =>
    onChange([
      ...items,
      { id: crypto.randomUUID(), trigger: '', match: 'contains', reply: '', enabled: true },
    ]);
  const update = (id: string, patch: Partial<AutoResponse>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Autoresponders</h3>
          <p className="mt-0.5 text-sm text-mist-muted">Reply automatically when a message matches a trigger.</p>
        </div>
        <button type="button" onClick={add} className="btn-ghost" disabled={items.length >= 25}>
          + Add
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-700 px-4 py-6 text-center text-sm text-mist-muted">
            No autoresponders yet. Add one to get started.
          </p>
        )}
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-mist-muted">When a message</span>
              <select className="input w-auto py-1.5" value={it.match} onChange={(e) => update(it.id, { match: e.target.value })}>
                {MATCH_MODES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                className="input w-40 py-1.5"
                placeholder="trigger"
                value={it.trigger}
                onChange={(e) => update(it.id, { trigger: e.target.value })}
              />
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => update(it.id, { enabled: !it.enabled })}
                  className={`text-xs font-medium ${it.enabled ? 'text-emerald-300' : 'text-mist-faint'}`}
                >
                  {it.enabled ? '● on' : '○ off'}
                </button>
                <button type="button" onClick={() => remove(it.id)} className="text-mist-faint hover:text-red-300" title="Remove">
                  ✕
                </button>
              </div>
            </div>
            <textarea
              className="input mt-3 min-h-[60px] resize-y"
              placeholder="…reply with this. Supports variables."
              value={it.reply}
              onChange={(e) => update(it.id, { reply: e.target.value })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
