'use client';

// A Discord-style preview of a Components V2 message: one accent "container"
// that holds the text, an optional divider, and any buttons — all inside the
// accent box (unlike legacy embeds, where buttons sat outside). Used by every
// editor where a customer designs a panel so they see how it'll look in Discord.

type PreviewButton = { label: string; emoji?: string; style?: 'primary' | 'success' | 'danger' | 'secondary' };

const BTN_BG: Record<NonNullable<PreviewButton['style']>, string> = {
  primary: '#5865f2',
  success: '#248046',
  danger: '#da373c',
  secondary: '#4e5058',
};

// Replace variables with sample values so the preview reads naturally.
function fill(s: string) {
  return String(s ?? '')
    .replaceAll('{user}', '@new-member')
    .replaceAll('{username}', 'new-member')
    .replaceAll('{memberName}', 'New Member')
    .replaceAll('{server}', 'Your Server')
    .replaceAll('{memberCount}', '1,248')
    .replaceAll('{level}', '7');
}

export function EmbedPreview({
  botName,
  accent = '#6366f1',
  content,
  title,
  description,
  image,
  footer,
  buttons,
  emptyHint = 'Nothing to preview yet.',
}: {
  botName?: string;
  accent?: string;
  content?: string;
  title?: string;
  description?: string;
  image?: string;
  footer?: string;
  buttons?: PreviewButton[];
  emptyHint?: string;
}) {
  const hasContent = Boolean(content && content.trim());
  const hasButtons = Boolean(buttons && buttons.length);
  const showContainer = Boolean(title || description || image || footer || hasButtons);

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

          {hasContent && <p className="mt-1 whitespace-pre-wrap break-words text-[#dbdee1]">{fill(content!)}</p>}

          {showContainer && (
            <div className="mt-2 max-w-md space-y-2 overflow-hidden rounded-lg border-l-4 bg-[#2b2d31] p-3" style={{ borderColor: accent || '#6366f1' }}>
              {title && <p className="text-[15px] font-semibold text-white">{fill(title)}</p>}
              {description && <p className="whitespace-pre-wrap break-words text-[#dbdee1]">{fill(description)}</p>}
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="max-h-40 rounded object-cover" onError={(ev) => ((ev.target as HTMLImageElement).style.display = 'none')} />
              )}
              {hasButtons && (
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-2">
                  {buttons!.map((b, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-white"
                      style={{ backgroundColor: BTN_BG[b.style || 'secondary'] }}
                    >
                      {b.emoji && <span>{b.emoji}</span>}
                      {b.label || 'Button'}
                    </span>
                  ))}
                </div>
              )}
              {footer && <p className="text-xs text-[#949ba4]">{fill(footer)}</p>}
            </div>
          )}

          {!showContainer && !hasContent && <p className="mt-1 italic text-[#6d7178]">{emptyHint}</p>}
        </div>
      </div>
    </div>
  );
}
