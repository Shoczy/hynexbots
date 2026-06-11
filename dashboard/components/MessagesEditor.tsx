'use client';

import { useState, type ReactNode } from 'react';
import { Field, Toggle } from './ui';
import { Card, RolesField } from './settingsKit';
import { BlockBuilder } from './BlockBuilder';
import { SendAction } from './SendAction';
import { emptyV2Message, fromLegacy } from '@/lib/blocks';
import { MATCH_MODES, VARIABLES, type Settings, type MessageBlock, type AutoResponse } from '@/lib/settings';

// Bare variable names (no braces) for the block builder's insert chips.
const VAR_TOKENS = VARIABLES.map((v) => v.token.replace(/[{}]/g, ''));

type Messages = Settings['messages'];

export function MessagesEditor({
  value,
  onChange,
  botName,
  appId,
}: {
  value: Messages;
  onChange: (m: Messages) => void;
  botName: string;
  appId?: string;
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
        footer={
          appId ? (
            <SendAction
              appId={appId}
              action="welcome_test"
              label="Send a test welcome"
              hint="Posts the welcome message above to its channel. Save changes first."
            />
          ) : null
        }
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
  footer,
}: {
  title: string;
  subtitle: string;
  block: MessageBlock;
  botName: string;
  onChange: (b: MessageBlock) => void;
  footer?: ReactNode;
}) {
  const set = (patch: Partial<MessageBlock>) => onChange({ ...block, ...patch });
  const v2 = block.v2 ?? emptyV2Message();
  // The block builder is the only body editor. If it's still empty, seed the
  // preview/editor from any legacy text+embed so old content isn't lost — it's
  // persisted as blocks the moment the customer edits anything.
  const display = v2.blocks.length
    ? v2
    : fromLegacy({
        enabled: true,
        accent: block.embed.color,
        text: block.text,
        title: block.embed.enabled ? block.embed.title : '',
        description: block.embed.enabled ? block.embed.description : '',
        image: block.embed.enabled ? block.embed.image : '',
        footer: block.embed.enabled ? block.embed.footer : '',
      });

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
        <div className="mt-5 space-y-5">
          <Field label="Channel ID" hint="Where this message is posted.">
            <input
              className="input max-w-xs font-mono"
              placeholder="123456789012345678"
              value={block.channelId}
              onChange={(e) => set({ channelId: e.target.value.replace(/\D/g, '') })}
            />
          </Field>

          {/* Components V2 block builder — stack text / separators / images / link buttons. */}
          <BlockBuilder value={display} onChange={(next) => set({ v2: next })} botName={botName} variables={VAR_TOKENS} />
        </div>
      )}

      {block.enabled && footer && <div className="mt-4 border-t border-ink-700/60 pt-4">{footer}</div>}
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
