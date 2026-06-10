'use client';

import type { MessageBlock } from '@/lib/settings';

// Replace variables with sample values so the preview reads naturally.
function fill(s: string) {
  return s
    .replaceAll('{user}', '@new-member')
    .replaceAll('{username}', 'new-member')
    .replaceAll('{memberName}', 'New Member')
    .replaceAll('{server}', 'Your Server')
    .replaceAll('{memberCount}', '1,248');
}

/**
 * A Discord-style render of a welcome/leave message as a Components V2 message:
 * the plain text and the embed body live together inside one accent container
 * (with a divider between them) — exactly how the bot now sends it.
 */
export function DiscordPreview({ block, botName }: { block: MessageBlock; botName: string }) {
  const hasText = block.text.trim().length > 0;
  const e = block.embed;
  const hasEmbedBody = e.enabled && Boolean(e.title || e.description || e.image || e.footer);
  const show = hasText || hasEmbedBody;
  const accent = hasEmbedBody ? e.color || '#6366f1' : '#6366f1';

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
            <div className="mt-2 max-w-md space-y-2 overflow-hidden rounded-lg border-l-4 bg-[#2b2d31] p-3" style={{ borderColor: accent }}>
              {hasText && <p className="whitespace-pre-wrap break-words text-[#dbdee1]">{fill(block.text)}</p>}
              {hasText && hasEmbedBody && <div className="h-px bg-white/10" />}
              {hasEmbedBody && (
                <>
                  {e.title && <p className="text-[15px] font-semibold text-white">{fill(e.title)}</p>}
                  {e.description && <p className="whitespace-pre-wrap break-words text-[#dbdee1]">{fill(e.description)}</p>}
                  {e.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.image} alt="" className="max-h-40 rounded object-cover" onError={(ev) => ((ev.target as HTMLImageElement).style.display = 'none')} />
                  )}
                  {e.footer && <p className="text-xs text-[#949ba4]">{fill(e.footer)}</p>}
                </>
              )}
            </div>
          ) : (
            <p className="mt-1 italic text-[#6d7178]">Nothing to show yet — add text or an embed.</p>
          )}
        </div>
      </div>
    </div>
  );
}
