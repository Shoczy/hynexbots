'use client';

import { Card, TextField, ChannelField, RoleField, uid } from './settingsKit';
import { CHANNEL_TYPES } from '@/lib/guildContext';
import type { ApplicationsSettings, AppForm, AppQuestion } from '@/lib/settings';

export function ApplicationsEditor({ value, onChange }: { value: ApplicationsSettings; onChange: (a: ApplicationsSettings) => void }) {
  const set = (patch: Partial<ApplicationsSettings>) => onChange({ ...value, ...patch });
  const setForms = (forms: AppForm[]) => set({ forms });
  const addForm = () =>
    setForms([...value.forms, { id: uid(), name: 'Staff Application', description: '', questions: [{ id: uid(), label: 'Why do you want to join the team?', style: 'paragraph', required: true }] }]);
  const patchForm = (id: string, p: Partial<AppForm>) => setForms(value.forms.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const removeForm = (id: string) => setForms(value.forms.filter((f) => f.id !== id));

  return (
    <div className="space-y-5">
      <Card title="Review & approval" desc="Where submitted applications land and what approval grants.">
        <ChannelField label="Review channel" hint="Staff approve or deny submissions here." types={CHANNEL_TYPES.text} value={value.reviewChannelId} onChange={(reviewChannelId) => set({ reviewChannelId })} />
        <RoleField label="Role on approval" hint="Optional — granted to the applicant when approved." value={value.approveRoleId} onChange={(approveRoleId) => set({ approveRoleId })} />
      </Card>

      <Card title="Application forms" desc="Members run /apply to fill these out. Up to 5 questions per form (Discord modal limit).">
        {value.forms.length === 0 && <p className="text-xs text-mist-muted">No forms yet. Add one to get started.</p>}
        <div className="space-y-4">
          {value.forms.map((form) => (
            <FormEditor key={form.id} form={form} onChange={(p) => patchForm(form.id, p)} onRemove={() => removeForm(form.id)} />
          ))}
        </div>
        <button type="button" onClick={addForm} className="btn-ghost text-sm" disabled={value.forms.length >= 10}>
          + Add form
        </button>
      </Card>
    </div>
  );
}

function FormEditor({ form, onChange, onRemove }: { form: AppForm; onChange: (p: Partial<AppForm>) => void; onRemove: () => void }) {
  const setQuestions = (questions: AppQuestion[]) => onChange({ questions });
  const addQ = () => setQuestions([...form.questions, { id: uid(), label: '', style: 'short', required: true }]);
  const patchQ = (id: string, p: Partial<AppQuestion>) => setQuestions(form.questions.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const removeQ = (id: string) => setQuestions(form.questions.filter((q) => q.id !== id));

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-mist">{form.name || 'Application'}</span>
        <button type="button" onClick={onRemove} className="text-mist-faint hover:text-red-300">
          Remove form
        </button>
      </div>
      <div className="space-y-3">
        <TextField label="Form name" value={form.name} maxLength={80} onChange={(name) => onChange({ name })} />
        <TextField label="Description" hint="Shown to applicants before they start." value={form.description} maxLength={500} onChange={(description) => onChange({ description })} />

        <div>
          <span className="label">Questions ({form.questions.length}/5)</span>
          <div className="mt-1 space-y-2">
            {form.questions.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/50 px-3 py-2">
                <input className="input min-w-[12rem] flex-1 py-1 text-sm" value={q.label} maxLength={45} placeholder="Question (max 45 chars)" onChange={(e) => patchQ(q.id, { label: e.target.value })} />
                <select className="input w-auto py-1 text-sm" value={q.style} onChange={(e) => patchQ(q.id, { style: e.target.value as AppQuestion['style'] })}>
                  <option value="short">Short</option>
                  <option value="paragraph">Paragraph</option>
                </select>
                <button type="button" onClick={() => patchQ(q.id, { required: !q.required })} className={`text-xs font-medium ${q.required ? 'text-emerald-300' : 'text-mist-faint'}`}>
                  {q.required ? 'required' : 'optional'}
                </button>
                <button type="button" onClick={() => removeQ(q.id)} className="text-mist-faint hover:text-red-300">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addQ} className="btn-ghost text-sm" disabled={form.questions.length >= 5}>
              + Add question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
