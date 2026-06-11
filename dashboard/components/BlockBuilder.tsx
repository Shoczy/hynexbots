'use client';

// Editor for a Components V2 message: stack and reorder text / separator / image
// / link-button blocks inside one accent container. Used wherever a customer
// designs a posted message (command replies, welcome/goodbye, panels).

import { Toggle } from './ui';
import { V2Preview, type PreviewButton } from './V2Preview';
import { newBlock, blockId, type V2Message, type V2Block, type V2Button } from '@/lib/blocks';

const ADD: { type: Parameters<typeof newBlock>[0]; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: '¶' },
  { type: 'separator', label: 'Separator', icon: '—' },
  { type: 'image', label: 'Image', icon: '🖼' },
  { type: 'buttons', label: 'Buttons', icon: '⬚' },
];

export function BlockBuilder({
  value,
  onChange,
  botName,
  accent,
  variables = [],
  extraButtons,
  sample,
  /** Label for the on/off toggle. Omit to hide the toggle (always-on surfaces). */
  toggleLabel,
  toggleHint,
}: {
  value: V2Message;
  onChange: (m: V2Message) => void;
  botName?: string;
  accent?: string;
  variables?: string[];
  extraButtons?: PreviewButton[];
  sample?: Record<string, string>;
  toggleLabel?: string;
  toggleHint?: string;
}) {
  const blocks = value.blocks;
  const setBlocks = (next: V2Block[]) => onChange({ ...value, blocks: next });
  const patch = (id: string, p: Partial<V2Block>) =>
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, ...p } as V2Block) : b)));
  const remove = (id: string) => setBlocks(blocks.filter((b) => b.id !== id));
  const add = (type: Parameters<typeof newBlock>[0]) => setBlocks([...blocks, newBlock(type)]);
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    setBlocks(next);
  };

  const editing = toggleLabel ? value.enabled : true;

  return (
    <div className="space-y-4">
      {toggleLabel && (
        <Toggle label={toggleLabel} hint={toggleHint} checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} />
      )}

      <div className={editing ? 'grid gap-5 lg:grid-cols-2' : 'pointer-events-none grid gap-5 opacity-50 lg:grid-cols-2'}>
        {/* Left: block list + controls */}
        <div className="space-y-3">
          {blocks.length === 0 && (
            <p className="rounded-xl border border-dashed border-ink-700 px-4 py-6 text-center text-sm text-mist-muted">
              No blocks yet. Add a text, separator, image or button block below.
            </p>
          )}

          {blocks.map((block, idx) => (
            <BlockCard
              key={block.id}
              block={block}
              index={idx}
              count={blocks.length}
              variables={variables}
              onPatch={(p) => patch(block.id, p)}
              onRemove={() => remove(block.id)}
              onMove={(dir) => move(idx, dir)}
            />
          ))}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-mist-faint">Add block:</span>
            {ADD.map((a) => (
              <button
                key={a.type}
                type="button"
                onClick={() => add(a.type)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 text-xs text-mist-muted transition-colors hover:border-accent/50 hover:text-mist"
              >
                <span aria-hidden>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-mist-faint">Container accent</span>
            <input
              type="color"
              className="h-8 w-10 cursor-pointer rounded-md border border-ink-600 bg-ink-900"
              value={value.accent || accent || '#6366f1'}
              onChange={(ev) => onChange({ ...value, accent: ev.target.value })}
            />
            <input
              className="input w-28 font-mono text-xs"
              placeholder="brand"
              value={value.accent}
              onChange={(ev) => onChange({ ...value, accent: ev.target.value })}
            />
            {value.accent && (
              <button type="button" onClick={() => onChange({ ...value, accent: '' })} className="text-xs text-mist-faint hover:text-mist">
                reset
              </button>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div>
          <p className="label mb-1.5">Live preview</p>
          <V2Preview message={value} botName={botName} accent={accent} extraButtons={extraButtons} sample={sample} />
        </div>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  index,
  count,
  variables,
  onPatch,
  onRemove,
  onMove,
}: {
  block: V2Block;
  index: number;
  count: number;
  variables: string[];
  onPatch: (p: Partial<V2Block>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-mist-faint">
          {BLOCK_LABEL[block.type]}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded px-1.5 py-0.5 text-mist-faint hover:text-mist disabled:opacity-30" title="Move up">
            ↑
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className="rounded px-1.5 py-0.5 text-mist-faint hover:text-mist disabled:opacity-30" title="Move down">
            ↓
          </button>
          <button type="button" onClick={onRemove} className="rounded px-1.5 py-0.5 text-mist-faint hover:text-red-300" title="Remove">
            ✕
          </button>
        </div>
      </div>

      {block.type === 'text' && <TextBlock block={block} variables={variables} onPatch={onPatch} />}
      {block.type === 'separator' && <SeparatorBlock block={block} onPatch={onPatch} />}
      {block.type === 'image' && (
        <input
          className="input text-sm"
          placeholder="https://… image URL"
          value={block.url}
          onChange={(e) => onPatch({ url: e.target.value })}
        />
      )}
      {block.type === 'buttons' && <ButtonsBlock block={block} onPatch={onPatch} />}
    </div>
  );
}

const BLOCK_LABEL: Record<V2Block['type'], string> = {
  text: 'Text',
  separator: 'Separator',
  image: 'Image',
  buttons: 'Link buttons',
};

function TextBlock({
  block,
  variables,
  onPatch,
}: {
  block: Extract<V2Block, { type: 'text' }>;
  variables: string[];
  onPatch: (p: Partial<V2Block>) => void;
}) {
  return (
    <div className="space-y-2">
      <textarea
        className="input min-h-[70px] text-sm"
        placeholder="Text — markdown works. Use ## for a heading, -# for small subtext."
        maxLength={4000}
        value={block.content}
        onChange={(e) => onPatch({ content: e.target.value })}
      />
      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onPatch({ content: `${block.content}${block.content && !block.content.endsWith(' ') ? ' ' : ''}{${v}}` })}
              className="rounded-md border border-ink-600 bg-ink-800 px-2 py-0.5 font-mono text-[11px] text-mist-muted transition-colors hover:border-accent/50 hover:text-mist"
            >
              {`{${v}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SeparatorBlock({
  block,
  onPatch,
}: {
  block: Extract<V2Block, { type: 'separator' }>;
  onPatch: (p: Partial<V2Block>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Toggle label="Show divider line" checked={block.divider} onChange={(divider) => onPatch({ divider })} />
      <Toggle label="Large spacing" checked={block.large} onChange={(large) => onPatch({ large })} />
    </div>
  );
}

function ButtonsBlock({
  block,
  onPatch,
}: {
  block: Extract<V2Block, { type: 'buttons' }>;
  onPatch: (p: Partial<V2Block>) => void;
}) {
  const setButtons = (buttons: V2Button[]) => onPatch({ buttons });
  const patchBtn = (id: string, p: Partial<V2Button>) => setButtons(block.buttons.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const removeBtn = (id: string) => setButtons(block.buttons.filter((b) => b.id !== id));
  const addBtn = () => setButtons([...block.buttons, { id: blockId(), label: '', url: '', emoji: '' }]);

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-mist-faint">Link buttons open a URL — up to 5 per row.</p>
      {block.buttons.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/50 px-2.5 py-2">
          <input className="input w-14 py-1 text-center text-sm" placeholder="🔗" maxLength={32} value={b.emoji} onChange={(e) => patchBtn(b.id, { emoji: e.target.value })} />
          <input className="input w-36 flex-1 py-1 text-sm" placeholder="Label" maxLength={80} value={b.label} onChange={(e) => patchBtn(b.id, { label: e.target.value })} />
          <input className="input w-48 flex-1 py-1 font-mono text-xs" placeholder="https://…" value={b.url} onChange={(e) => patchBtn(b.id, { url: e.target.value })} />
          <button type="button" onClick={() => removeBtn(b.id)} className="text-mist-faint hover:text-red-300" title="Remove button">
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={addBtn} className="btn-ghost text-xs" disabled={block.buttons.length >= 5}>
        + Add button
      </button>
    </div>
  );
}
