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
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { LicensePanel } from '@/components/LicensePanel';
import { ModerationEditor } from '@/components/ModerationEditor';
import { VerificationEditor } from '@/components/VerificationEditor';
import { ReactionRolesEditor } from '@/components/ReactionRolesEditor';
import { AntiNukeEditor } from '@/components/AntiNukeEditor';
import { TicketsEditor } from '@/components/TicketsEditor';
import { ApplicationsEditor } from '@/components/ApplicationsEditor';
import { FaqEditor } from '@/components/FaqEditor';
import { EconomyEditor } from '@/components/EconomyEditor';
import { GiveawaysEditor } from '@/components/GiveawaysEditor';
import { MusicEditor } from '@/components/MusicEditor';
import { PlaylistsEditor } from '@/components/PlaylistsEditor';
import { LevelingEditor } from '@/components/LevelingEditor';
import {
  MODULES,
  LANGS,
  effectiveFeatures,
  defaultModeration,
  defaultVerification,
  defaultReactionRoles,
  defaultAntiNuke,
  defaultTickets,
  defaultApplications,
  defaultFaq,
  defaultGiveaways,
  defaultEconomy,
  defaultMusic,
  defaultPlaylists,
  defaultLeveling,
  type Settings,
  type Features,
} from '@/lib/settings';
import { GuildProvider, type Guild } from '@/lib/guildContext';
import { withBase } from '@/lib/paths';

type Tab = 'basics' | 'modules' | 'messages' | 'moderation' | 'verification' | 'reactionroles' | 'antinuke' | 'tickets' | 'applications' | 'faq' | 'economy' | 'giveaways' | 'music' | 'playlists' | 'leveling' | 'commands' | 'analytics' | 'logs' | 'team' | 'license';
const TABS: { id: Tab; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'modules', label: 'Modules' },
  { id: 'messages', label: 'Messages & Embeds' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'verification', label: 'Verification' },
  { id: 'reactionroles', label: 'Reaction Roles' },
  { id: 'antinuke', label: 'Anti-Nuke' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'applications', label: 'Applications' },
  { id: 'faq', label: 'FAQ' },
  { id: 'economy', label: 'Economy' },
  { id: 'giveaways', label: 'Giveaways' },
  { id: 'music', label: 'Music' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'leveling', label: 'Leveling' },
  { id: 'commands', label: 'Commands' },
];

// Sidebar grouping for the editor nav — keeps the (now many) tabs tidy and
// guides customers: general setup, the modules they bought, read-only insights,
// and account management. Only groups with at least one in-scope tab render.
const TAB_GROUPS: { label: string; tabs: Tab[] }[] = [
  { label: 'Setup', tabs: ['basics', 'modules', 'messages', 'commands'] },
  {
    label: 'Modules',
    tabs: ['moderation', 'verification', 'reactionroles', 'antinuke', 'tickets', 'applications', 'faq', 'economy', 'giveaways', 'music', 'playlists', 'leveling'],
  },
  { label: 'Insights', tabs: ['analytics', 'logs'] },
  { label: 'Manage', tabs: ['team', 'license'] },
];

export default function EditorPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bot, setBot] = useState<{ name: string; label: string; emoji: string; type?: string; features?: Features; isOwner?: boolean; permissions?: string[]; inviteUrl?: string | null } | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [tab, setTab] = useState<Tab>('basics');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(withBase(`/api/bot/${appId}/config`), { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = withBase('/');
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
    const ids: Tab[] = [...editable, 'analytics', 'logs', ...(owner ? (['team', 'license'] as Tab[]) : [])];
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
  function setVerification(verification: Settings['verification']) {
    setSettings((s) => (s ? { ...s, verification } : s));
    markDirty();
  }
  function setReactionRoles(reactionRoles: Settings['reactionRoles']) {
    setSettings((s) => (s ? { ...s, reactionRoles } : s));
    markDirty();
  }
  function setAntiNuke(antiNuke: Settings['antiNuke']) {
    setSettings((s) => (s ? { ...s, antiNuke } : s));
    markDirty();
  }
  function setTickets(tickets: Settings['tickets']) {
    setSettings((s) => (s ? { ...s, tickets } : s));
    markDirty();
  }
  function setApplications(applications: Settings['applications']) {
    setSettings((s) => (s ? { ...s, applications } : s));
    markDirty();
  }
  function setFaq(faq: Settings['faq']) {
    setSettings((s) => (s ? { ...s, faq } : s));
    markDirty();
  }
  function setEconomy(economy: Settings['economy']) {
    setSettings((s) => (s ? { ...s, economy } : s));
    markDirty();
  }
  function setGiveaways(giveaways: Settings['giveaways']) {
    setSettings((s) => (s ? { ...s, giveaways } : s));
    markDirty();
  }
  function setMusic(music: Settings['music']) {
    setSettings((s) => (s ? { ...s, music } : s));
    markDirty();
  }
  function setPlaylists(playlists: Settings['playlists']) {
    setSettings((s) => (s ? { ...s, playlists } : s));
    markDirty();
  }
  function setLeveling(leveling: Settings['leveling']) {
    setSettings((s) => (s ? { ...s, leveling } : s));
    markDirty();
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    const res = await fetch(withBase(`/api/bot/${appId}/config`), {
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
          <a href={withBase('/bots')} className="btn-ghost mt-6">
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
    { id: 'analytics' as Tab, label: 'Analytics' },
    { id: 'logs' as Tab, label: 'Logs' },
    ...(isOwner ? [{ id: 'team' as Tab, label: 'Team' }, { id: 'license' as Tab, label: 'License' }] : []),
  ];
  const visibleModules = MODULES.filter((m) => features.modules.includes(m.key));
  const canControlProcess = isOwner || perms.includes('process');
  const canEditAnything = isOwner || editableTabs.length > 0;
  const visibleIds = new Set<Tab>(visibleTabs.map((t) => t.id));
  const labelOf = (id: Tab) => visibleTabs.find((t) => t.id === id)?.label ?? id;

  return (
    <>
      <TopBar />
      <main className="container-content py-10">
        <a href={withBase('/bots')} className="text-sm text-mist-muted transition-colors hover:text-mist">
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

        {/* One-click invite with the right permissions for this product. */}
        {bot?.inviteUrl && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-900/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-mist">Add your bot to a server</div>
              <p className="text-xs text-mist-muted">Opens Discord with exactly the permissions this bot needs — no extra access.</p>
            </div>
            <a href={bot.inviteUrl} target="_blank" rel="noreferrer" className="btn-primary shrink-0 text-sm">
              Add to server
            </a>
          </div>
        )}

        {/* Live process status & controls */}
        <div className="mt-6">
          <ProcessControl appId={appId} canControl={canControlProcess} />
        </div>

        <GuildProvider guild={guild}>
        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:gap-10">
          {/* Mobile: grouped dropdown nav */}
          <div className="lg:hidden">
            <select className="input" value={tab} onChange={(e) => setTab(e.target.value as Tab)}>
              {TAB_GROUPS.map((g) => {
                const items = g.tabs.filter((id) => visibleIds.has(id));
                if (!items.length) return null;
                return (
                  <optgroup key={g.label} label={g.label}>
                    {items.map((id) => (
                      <option key={id} value={id}>
                        {labelOf(id)}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Desktop: grouped sidebar nav */}
          <nav className="sticky top-24 hidden w-56 shrink-0 space-y-6 self-start lg:block">
            {TAB_GROUPS.map((g) => {
              const items = g.tabs.filter((id) => visibleIds.has(id));
              if (!items.length) return null;
              return (
                <div key={g.label}>
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-mist-faint">{g.label}</p>
                  <div className="mt-2 space-y-0.5">
                    {items.map((id) => (
                      <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`relative flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          tab === id ? 'bg-ink-800 text-mist' : 'text-mist-muted hover:bg-ink-900/70 hover:text-mist'
                        }`}
                      >
                        {tab === id && (
                          <motion.span layoutId="nav-active" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />
                        )}
                        {labelOf(id)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Content */}
          <div className="min-w-0 flex-1">
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

          {tab === 'verification' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <VerificationEditor value={settings.verification ?? defaultVerification()} onChange={setVerification} accent={settings.basics.embedColor} botName={settings.basics.nickname || bot?.name || 'Your Bot'} />
            </motion.div>
          )}

          {tab === 'reactionroles' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <ReactionRolesEditor value={settings.reactionRoles ?? defaultReactionRoles()} onChange={setReactionRoles} accent={settings.basics.embedColor} botName={settings.basics.nickname || bot?.name || 'Your Bot'} />
            </motion.div>
          )}

          {tab === 'antinuke' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <AntiNukeEditor value={settings.antiNuke ?? defaultAntiNuke()} onChange={setAntiNuke} />
            </motion.div>
          )}

          {tab === 'tickets' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <TicketsEditor value={settings.tickets ?? defaultTickets()} onChange={setTickets} accent={settings.basics.embedColor} botName={settings.basics.nickname || bot?.name || 'Your Bot'} />
            </motion.div>
          )}

          {tab === 'applications' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <ApplicationsEditor value={settings.applications ?? defaultApplications()} onChange={setApplications} />
            </motion.div>
          )}

          {tab === 'faq' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <FaqEditor value={settings.faq ?? defaultFaq()} onChange={setFaq} accent={settings.basics.embedColor} botName={settings.basics.nickname || bot?.name || 'Your Bot'} />
            </motion.div>
          )}

          {tab === 'economy' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <EconomyEditor value={settings.economy ?? defaultEconomy()} onChange={setEconomy} />
            </motion.div>
          )}

          {tab === 'giveaways' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <GiveawaysEditor value={settings.giveaways ?? defaultGiveaways()} onChange={setGiveaways} />
            </motion.div>
          )}

          {tab === 'music' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <MusicEditor value={settings.music ?? defaultMusic()} onChange={setMusic} />
            </motion.div>
          )}

          {tab === 'playlists' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <PlaylistsEditor value={settings.playlists ?? defaultPlaylists()} onChange={setPlaylists} />
            </motion.div>
          )}

          {tab === 'leveling' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <LevelingEditor value={settings.leveling ?? defaultLeveling()} onChange={setLeveling} accent={settings.basics.embedColor} botName={settings.basics.nickname || bot?.name || 'Your Bot'} />
            </motion.div>
          )}

          {tab === 'logs' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <BotLogs appId={appId} />
            </motion.div>
          )}

          {tab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <AnalyticsPanel appId={appId} />
            </motion.div>
          )}

          {tab === 'team' && isOwner && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <TeamEditor appId={appId} />
            </motion.div>
          )}

          {tab === 'license' && isOwner && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <LicensePanel appId={appId} />
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
        </div>
        </GuildProvider>
      </main>

      {/* Sticky save bar — config tabs only (Team, License, Analytics & Logs are read-only). */}
      {tab !== 'team' && tab !== 'logs' && tab !== 'analytics' && tab !== 'license' && (
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
