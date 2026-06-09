'use client';

import { Card, Row, ChipInput, uid } from './settingsKit';
import { EmbedPreview } from './EmbedPreview';
import type { FaqSettings, FaqEntry } from '@/lib/settings';

export function FaqEditor({
  value,
  onChange,
  accent,
  botName,
}: {
  value: FaqSettings;
  onChange: (f: FaqSettings) => void;
  accent?: string;
  botName?: string;
}) {
  const set = (patch: Partial<FaqSettings>) => onChange({ ...value, ...patch });
  const setEntries = (entries: FaqEntry[]) => set({ entries });
  const add = () => setEntries([...value.entries, { id: uid(), keywords: [], answer: '', match: 'contains' }]);
  const patch = (id: string, p: Partial<FaqEntry>) => setEntries(value.entries.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const remove = (id: string) => setEntries(value.entries.filter((e) => e.id !== id));

  return (
    <div className="space-y-5">
      <Card title="Behaviour">
        <Row label="Auto-answer" hint="Reply automatically when a message matches an entry's keywords." checked={value.autoAnswer} onChange={(autoAnswer) => set({ autoAnswer })} />
      </Card>

      <Card title="FAQ entries" desc="Members also look these up with /faq. Each entry replies when its keywords match.">
        {value.entries.length === 0 && <p className="text-xs text-mist-muted">No entries yet. Add one to get started.</p>}
        <div className="space-y-3">
          {value.entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-mist">Entry</span>
                <div className="flex items-center gap-3">
                  <select className="input w-auto py-1 text-sm" value={e.match} onChange={(ev) => patch(e.id, { match: ev.target.value as FaqEntry['match'] })}>
                    <option value="contains">message contains a keyword</option>
                    <option value="exact">message is exactly a keyword</option>
                  </select>
                  <button type="button" onClick={() => remove(e.id)} className="text-mist-faint hover:text-red-300">
                    Remove
                  </button>
                </div>
              </div>
              <span className="label">Keywords</span>
              <div className="mt-1">
                <ChipInput
                  items={e.keywords}
                  onChange={(keywords) => patch(e.id, { keywords })}
                  placeholder="Add keyword"
                  transform={(s) => s.trim().toLowerCase()}
                  validate={(s) => s.length > 0 && s.length <= 50}
                />
              </div>
              <span className="label mt-3 block">Answer</span>
              <textarea className="input mt-1 min-h-[70px] resize-y" value={e.answer} maxLength={2000} placeholder="The reply members get." onChange={(ev) => patch(e.id, { answer: ev.target.value })} />
              {(e.answer.trim() || e.keywords.length > 0) && (
                <div className="mt-3">
                  <span className="label">Preview</span>
                  <div className="mt-1">
                    <EmbedPreview botName={botName} accent={accent} title={`💡 ${e.keywords[0] || 'FAQ'}`} description={e.answer} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={add} className="btn-ghost text-sm" disabled={value.entries.length >= 50}>
          + Add entry
        </button>
      </Card>
    </div>
  );
}
