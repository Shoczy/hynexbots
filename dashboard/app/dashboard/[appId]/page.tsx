'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TopBar } from '@/components/TopBar';
import { Field, Toggle, Spinner } from '@/components/ui';
import { MessagesEditor } from '@/components/MessagesEditor';
import { CommandsEditor } from '@/components/CommandsEditor';
import { ProcessControl } from '@/components/ProcessControl';
import { BotLogs } from '@/components/BotLogs';
import { TeamEditor } from '@/components/TeamEditor';
import { ModerationEditor } from '@/components/ModerationEditor';
import { TicketsEditor } from '@/components/TicketsEditor';
import { EconomyEditor } from '@/components/EconomyEditor';
import { MusicEditor } from '@/components/MusicEditor';
import {
  MODULES,
  LANGS,
  effectiveFeatures,
  defaultModeration,
  defaultTickets,
  defaultEconomy,
  defaultMusic,
  type Settings,
  type Features,
} from '@/lib/settings';
import { GuildProvider, type Guild } from '@/lib/guildContext';

type Tab = 'basics' | 'modules' | 'messages' | 'moderation' | 'tickets' | 'economy' | 'music' | 'commands' | 'logs' | 'team';
const TABS: { id: Tab; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'modules', label: 'Modules' },
  { id: 'messages', label: 'Messages & Embeds' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'economy', label: 'Economy' },
  { id: 'music', label: 'Music' },
  { id: 'commands', label: 'Commands' },
];

export default function EditorPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bot, setBot] = useState<{ name: string; label: string; emoji: string; type?: string; features?: Features; isOwner?: boolean; permissions?: string[] } | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [tab, setTab] = useState<Tab>('basics');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/bot/${appId}/config`, { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/';
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        setError(data.error === 'no_access' ? 'You don’t have access to this bot.' : data.error || 'Failed to load.');
        setLoading(false);
        return;
      }
      setBot(data.bot);
      setSettings(data.settings);
      setGuild(data.guild ?? null);
      setLoading(false);
    })();
  }, [appId]);

  // Keep the active tab valid for this user's access (a member may not be able
  // to see the default 'basics' tab).
  useEffect(() => {
    if (!bot) return;
    const f = effectiveFeatures(bot.type, bot.features);
    const owner = Boolean(bot.isOwner);
    const p = bot.permissions ?? [];
    const prod = TABS.filter((t) => f.tabs.includes(t.id)).map((t) => t.id as Tab);
    const editable = owner ? prod : prod.filter((id) => p.includes(id));
    const ids: Tab[] = [...editable, 'logs', ...(owner ? (['team'] as Tab[]) : [])];
    setTab((cur) => (ids.includes(cur) ? cur : ids[0]));
  }, [bot]);

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };
  function patchBasics<K extends keyof Settings['basics']>(k: K, v: Settings['basics'][K]) {
    setSettings((s) => (s ? { ...s, basics: { ...s.basics, [k]: v } } : s));
    markDirty();
  }
  function toggleModule(k: string, v: boolean) {
    setSettings((s) => (s ? { ...s, modules: { ...s.modules, [k]: v } } : s));
    markDirty();
  }
  function setMessages(messages: Settings['messages']) {
    setSettings((s) => (s ? { ...s, messages } : s));
    markDirty();
  }
  function setCommands(commands: Settings['commands']) {
    setSettings((s) => (s ? { ...s, commands } : s));
    markDirty();
  }
  function setModeration(moderation: Settings['moderation']) {
    setSettings((s) => (s ? { ...s, moderation } : s));
    markDirty();
  }
  function setTickets(tickets: Settings['tickets']) {
    setSettings((s) => (s ? { ...s, tickets } : s));
    markDirty();
  }
  function setEconomy(economy: Settings['economy']) {
    setSettings((s) => (s ? { ...s, economy } : s));
    markDirty();
  }
  function setMusic(music: Settings['music']) {
    setSettings((s) => (s ? { ...s, music } : s));
    markDirty();
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    const res = await fetch(`/api/bot/${appId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      setSettings(data.settings);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError(data.error || 'Save failed.');
    }
  }

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="flex min-h-[60vh] items-center justify-center text-mist-muted">
          <Spinner className="h-6 w-6" />
        </div>
      </>
    );
  }

  if (error || !settings) {
    return (
      <>
        <TopBar />
        <main className="container-content py-16 text-center">
          <p className="text-mist-muted">{error || 'Something went wrong.'}</p>
          <a href="/dashboard" className="btn-ghost mt-6">
            ← Back to dashboard
          </a>
        </main>
      </>
    );
  }

  // Scope the editor to this bot's product. Server `features` win; otherwise we
  // fall back to a type-based scope so the UI never shows unrelated systems.
  const features = effectiveFeatures(bot?.type, bot?.features);
  const isOwner = Boolean(bot?.isOwner);
  const perms = bot?.permissions ?? [];
  // Config tabs are scoped to the product, then further to what this member may
  // edit (the owner sees everything). Logs are read-only and always available;
  // the Team tab is owner-only.
  const productTabs = TABS.filter((t) => features.tabs.includes(t.id));
  const editableTabs = isOwner ? productTabs : productTabs.filter((t) => perms.includes(t.id));
  const visibleTabs = [
    ...editableTabs,
    { id: 'logs' as Tab, label: 'Logs' },
    ...(isOwner ? [{ id: 'team' as Tab, label: 'Team' }] : []),
  ];
  const visibleModules = MODULES.filter((m) => features.modules.includes(m.key));
  const canControlProcess = isOwner || perms.includes('process');
  const canEditAnything = isOwner || editableTabs.length > 0;

  return (
    <>
      <TopBar />
      <main className="container-content py-10">
        <a href="/dashboard" className="text-sm text-mist-muted transition-colors hover:text-mist">
          ← All bots
        </a>

        <div className="mt-4 flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-ink-700 bg-ink-800 text-3xl">
            {bot?.emoji}
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tightest">{bot?.name}</h1>
            <p className="text-sm text-mist-muted">
              {bot?.label} · <span className="font-mono text-xs">{appId}</span>
            </p>
          </div>
        </div>

        {/* Live process status & controls */}
        <div className="mt-6">
          <ProcessControl appId={appId} canControl={canControlProcess} />
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-1 border-b border-ink-700">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id ? 'text-mist' : 'text-mist-muted hover:text-mist'
              }`}
            >
              {t.label}
              {tab === t.id && (
                <motion.span layoutId="tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>

        <GuildProvider guild={guild}>
        <div className="mt-8">
          {tab === 'basics' && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card max-w-xl p-6">
              <h2 className="font-display text-xl font-semibold">Basics</h2>
              <p className="mt-1 text-sm text-mist-muted">Core identity and behavior.</p>
              <div className="mt-5 space-y-4">
                <Field label="Command prefix" hint="Used for legacy text commands.">
                  <input className="input font-mono" maxLength={5} value={settings.basics.prefix} onChange={(e) => patchBasics('prefix', e.target.value)} />
                </Field>
                <Field label="Embed color">
                  <div className="flex items-center gap-3">
                    <input type="color" className="h-10 w-12 cursor-pointer rounded-lg border border-ink-600 bg-ink-900" value={settings.basics.embedColor} onChange={(e) => patchBasics('embedColor', e.target.value)} />
                    <input className="input font-mono" value={settings.basics.embedColor} onChange={(e) => patchBasics('embedColor', e.target.value)} />
                  </div>
                </Field>
                <Field label="Bot nickname" hint="Leave blank to keep the default name.">
                  <input className="input" maxLength={32} value={settings.basics.nickname} onChange={(e) => patchBasics('nickname', e.target.value)} placeholder="e.g. Hynex Guardian" />
                </Field>
                <Field label="Language">
                  <select className="input" value={settings.basics.language} onChange={(e) => patchBasics('language', e.target.value)}>
                    {LANGS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Log channel ID" hint="Where the bot posts logs. Right-click a channel → Copy ID.">
                  <input className="input font-mono" value={settings.basics.logChannelId} onChange={(e) => patchBasics('logChannelId', e.target.value.replace(/\D/g, ''))} placeholder="123456789012345678" />
                </Field>
              </div>
            </motion.section>
          )}

          {tab === 'modules' && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
              <h2 className="font-display text-xl font-semibold">Modules</h2>
              <p className="mt-1 text-sm text-mist-muted">Turn features on or off. Changes apply to your live bot.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {visibleModules.map((m) => (
                  <Toggle key={m.key} label={m.label} hint={m.hint} checked={Boolean(settings.modules[m.key])} onChange={(v) => toggleModule(m.key, v)} />
                ))}
              </div>
            </motion.section>
          )}

          {tab === 'messages' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <MessagesEditor value={settings.messages} onChange={setMessages} botName={settings.basics.nickname || bot?.name || 'Your Bot'} />
            </motion.div>
          )}

          {tab === 'moderation' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <ModerationEditor value={settings.moderation ?? defaultModeration()} onChange={setModeration} />
            </motion.div>
          )}

          {tab === 'tickets' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <TicketsEditor value={settings.tickets ?? defaultTickets()} onChange={setTickets} />
            </motion.div>
          )}

          {tab === 'economy' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <EconomyEditor value={settings.economy ?? defaultEconomy()} onChange={setEconomy} />
            </motion.div>
          )}

          {tab === 'music' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <MusicEditor value={settings.music ?? defaultMusic()} onChange={setMusic} />
            </motion.div>
          )}

          {tab === 'logs' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <BotLogs appId={appId} />
            </motion.div>
          )}

          {tab === 'team' && isOwner && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <TeamEditor appId={appId} />
            </motion.div>
          )}

          {tab === 'commands' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <CommandsEditor
                value={settings.commands}
                modules={settings.modules}
                onChange={setCommands}
                groups={features.commandGroups}
                modulesLocked={!features.tabs.includes('modules')}
                botName={settings.basics.nickname || bot?.name || 'Your Bot'}
              />
            </motion.div>
          )}
        </div>
        </GuildProvider>
      </main>

      {/* Sticky save bar — config tabs only (Team & Logs manage themselves). */}
      {tab !== 'team' && tab !== 'logs' && (
        <div className="sticky bottom-0 z-30 border-t border-ink-700/60 bg-ink-950/80 backdrop-blur-xl">
          <div className="container-content flex items-center justify-between py-4">
            <p className="text-sm text-mist-muted">
              {saved ? (
                <span className="text-emerald-300">✓ Saved — your bot will pick this up shortly.</span>
              ) : dirty ? (
                'You have unsaved changes.'
              ) : (
                'All changes saved.'
              )}
            </p>
            <button onClick={save} className="btn-primary" disabled={!dirty || saving || !canEditAnything}>
              {saving ? <Spinner /> : null}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
