// Shared Discord "Components V2" message model used by every editor that lets a
// customer design a posted message (command replies, welcome/goodbye, panels).
//
// A V2 message is an ordered list of blocks rendered inside one accent container
// — exactly how the bots build it with the `v2(items, accent)` helper. This is a
// superset of the old single-embed model: text + separators + images + buttons,
// freely stacked and reordered.

export type V2BlockType = 'text' | 'separator' | 'image' | 'buttons';

export type V2Button = {
  id: string;
  label: string;
  /** Link buttons only — the only kind that works without a server-side handler. */
  url: string;
  emoji: string;
};

export type V2Block =
  | { id: string; type: 'text'; content: string }
  | { id: string; type: 'separator'; divider: boolean; large: boolean }
  | { id: string; type: 'image'; url: string }
  | { id: string; type: 'buttons'; buttons: V2Button[] };

export type V2Message = {
  /** When false, the surface uses its built-in/default output instead. */
  enabled: boolean;
  /** Container accent color (hex). Empty = the bot's brand accent. */
  accent: string;
  blocks: V2Block[];
};

let seq = 0;
/** Stable-enough id for editor list keys (crypto.randomUUID when available). */
export function blockId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `b${Date.now().toString(36)}${(seq++).toString(36)}`;
}

export function emptyV2Message(): V2Message {
  return { enabled: false, accent: '', blocks: [] };
}

export function newBlock(type: V2BlockType): V2Block {
  switch (type) {
    case 'separator':
      return { id: blockId(), type: 'separator', divider: true, large: false };
    case 'image':
      return { id: blockId(), type: 'image', url: '' };
    case 'buttons':
      return { id: blockId(), type: 'buttons', buttons: [{ id: blockId(), label: '', url: '', emoji: '' }] };
    case 'text':
    default:
      return { id: blockId(), type: 'text', content: '' };
  }
}

/** True when the message has something worth rendering. */
export function hasContent(m?: V2Message | null): boolean {
  if (!m || !m.blocks?.length) return false;
  return m.blocks.some((b) => {
    if (b.type === 'text') return b.content.trim().length > 0;
    if (b.type === 'image') return b.url.trim().length > 0;
    if (b.type === 'buttons') return b.buttons.some((x) => x.label.trim() && x.url.trim());
    return true; // a separator is renderable on its own
  });
}

/**
 * Build a V2 message from the legacy single-embed shape ({title, description,
 * image, footer} + optional leading text). Lets old saved configs and the
 * existing editors migrate into the block model without losing anything.
 */
export function fromLegacy(opts: {
  enabled?: boolean;
  accent?: string;
  text?: string;
  title?: string;
  description?: string;
  image?: string;
  footer?: string;
}): V2Message {
  const blocks: V2Block[] = [];
  const push = (content: string) => content.trim() && blocks.push({ id: blockId(), type: 'text', content });
  if (opts.text) push(opts.text);
  if (opts.title) push(`## ${opts.title}`);
  if (opts.description) push(opts.description);
  if (opts.image && opts.image.trim()) blocks.push({ id: blockId(), type: 'image', url: opts.image });
  if (opts.footer) push(`-# ${opts.footer}`);
  return { enabled: Boolean(opts.enabled), accent: opts.accent || '', blocks };
}
