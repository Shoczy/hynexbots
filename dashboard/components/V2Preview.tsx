'use client';

// Discord-style render of a Components V2 message: one accent container holding
// the ordered blocks (text / separator / image / link buttons), plus any
// system buttons the bot appends (e.g. a Verify button). Mirrors how the running
// bot builds the message with its `v2(items, accent)` helper, so what the
// customer designs here is what the server sees.

import type { V2Message, V2Block } from '@/lib/blocks';

export type PreviewButton = {
  label: string;
  emoji?: string;
  style?: 'primary' | 'success' | 'danger' | 'secondary' | 'link';
};

const BTN_BG: Record<NonNullable<PreviewButton['style']>, string> = {
  primary: '#5865f2',
  success: '#248046',
  danger: '#da373c',
  secondary: '#4e5058',
  link: '#4e5058',
};

const DEFAULT_SAMPLE: Record<string, string> = {
  user: '@new-member',
  username: 'new-member',
  memberName: 'New Member',
  server: 'Your Server',
  memberCount: '1,248',
  level: '7',
};

function fill(s: string, sample: Record<string, string>) {
  return String(s ?? '').replace(/\{(\w+)\}/g, (_, k) => sample[k] ?? `{${k}}`);
}

/** Render one text block, honoring the `##` heading and `-#` subtext markdown. */
function TextLine({ raw, sample }: { raw: string; sample: Record<string, string> }) {
  const text = fill(raw, sample);
  if (text.startsWith('## ')) return <p className="text-[15px] font-semibold text-white">{text.slice(3)}</p>;
  if (text.startsWith('# ')) return <p className="text-lg font-bold text-white">{text.slice(2)}</p>;
  if (text.startsWith('-# ')) return <p className="text-xs text-[#949ba4]">{text.slice(3)}</p>;
  return <p className="whitespace-pre-wrap break-words text-[#dbdee1]">{text}</p>;
}

function Buttons({ buttons }: { buttons: PreviewButton[] }) {
  if (!buttons.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-white"
          style={{ backgroundColor: BTN_BG[b.style || 'secondary'] }}
        >
          {b.emoji && <span>{b.emoji}</span>}
          {b.label || 'Button'}
          {b.style === 'link' && <span className="opacity-60">↗</span>}
        </span>
      ))}
    </div>
  );
}

function renderBlock(block: V2Block, sample: Record<string, string>) {
  switch (block.type) {
    case 'text':
      return block.content.trim() ? <TextLine key={block.id} raw={block.content} sample={sample} /> : null;
    case 'separator':
      return (
        <div key={block.id} className={block.large ? 'py-1.5' : 'py-0.5'}>
          {block.divider && <div className="h-px bg-white/10" />}
        </div>
      );
    case 'image':
      return block.url.trim() ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={block.id}
          src={block.url}
          alt=""
          className="max-h-44 w-full rounded object-cover"
          onError={(ev) => ((ev.target as HTMLImageElement).style.display = 'none')}
        />
      ) : null;
    case 'buttons': {
      const btns = block.buttons
        .filter((b) => b.label.trim() || b.url.trim())
        .map((b) => ({ label: fill(b.label, sample) || 'Button', emoji: b.emoji || undefined, style: 'link' as const }));
      return btns.length ? <Buttons key={block.id} buttons={btns} /> : null;
    }
    default:
      return null;
  }
}

export function V2Preview({
  message,
  botName,
  accent,
  extraButtons,
  sample,
  emptyHint = 'Nothing to preview yet — add a block.',
}: {
  message: V2Message;
  botName?: string;
  /** Falls back to the message accent, then brand indigo. */
  accent?: string;
  /** System buttons the bot appends after the content (e.g. Verify). */
  extraButtons?: PreviewButton[];
  /** Override/extend the sample variable values. */
  sample?: Record<string, string>;
  emptyHint?: string;
}) {
  const vars = { ...DEFAULT_SAMPLE, ...(sample || {}) };
  const color = message.accent || accent || '#6366f1';
  const rendered = message.blocks.map((b) => renderBlock(b, vars)).filter(Boolean);
  const hasExtra = Boolean(extraButtons && extraButtons.length);
  const show = rendered.length > 0 || hasExtra;

  return (
    <div className="rounded-xl border border-ink-700 bg-[#313338] p-4 text-sm">
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/30 text-base">🤖</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{botName || 'Your Bot'}</span>
            <span className="rounded bg-accent px-1.5 text-[10px] font-semibold text-white">APP</span>
            <span className="text-xs text-[#949ba4]">today</span>
          </div>

          {show ? (
            <div
              className="mt-2 max-w-md space-y-2 overflow-hidden rounded-lg border-l-4 bg-[#2b2d31] p-3"
              style={{ borderColor: color }}
            >
              {rendered}
              {hasExtra && <Buttons buttons={extraButtons!} />}
            </div>
          ) : (
            <p className="mt-1 italic text-[#6d7178]">{emptyHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
