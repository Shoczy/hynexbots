'use strict';

/**
 * Per-product capability map. Determines which dashboard tabs, modules and
 * command groups a given bot exposes. The dashboard filters its editor by
 * these (so a customer only sees settings that apply to the bot they bought),
 * and `sanitizeSettings` enforces them on save so the scope can't be bypassed.
 *
 * A bot row may carry an explicit `features` override (JSON) — used for bespoke
 * `custom` builds. When absent, the product `type` template below applies.
 */

const ALL_TABS = ['basics', 'modules', 'messages', 'commands']; // generic tabs (custom default)
// Every valid tab id, including type-specific settings tabs — used to clamp overrides.
const KNOWN_TABS = ['basics', 'modules', 'messages', 'commands', 'moderation', 'verification', 'reactionroles', 'antinuke', 'leveling', 'fivem'];
const ALL_MODULES = ['moderation', 'verification', 'reactionroles', 'antinuke', 'welcome', 'leveling', 'fivem'];

// Which settings tab a module's deeper config lives under. `welcome` is edited in
// the shared Messages tab; the rest each have a dedicated tab. Used to surface the
// right tabs when a custom bot is built from a module list.
const MODULE_TABS = {
  moderation: 'moderation',
  verification: 'verification',
  reactionroles: 'reactionroles',
  antinuke: 'antinuke',
  leveling: 'leveling',
  fivem: 'fivem',
  welcome: 'messages',
};

// Command catalog, grouped. Kept in sync with the dashboard's COMMAND_GROUPS
// (dashboard/lib/settings.ts) — two codebases, no shared package. These must
// list EVERY command the matching product bot actually ships, or the dashboard
// can't expose it and saves would drop its per-command settings.
const COMMAND_GROUPS = [
  { id: 'moderation', commands: ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'purge', 'lockdown', 'slowmode', 'temprole'] },
  { id: 'verification', commands: ['verify-panel'] },
  { id: 'reactionroles', commands: ['roles-panel'] },
  { id: 'leveling', commands: ['rank', 'levels', 'setxp'] },
  { id: 'fivem', commands: ['status', 'players', 'whitelist', 'restart', 'playtime', 'playtime-top', 'serverstats', 'fivem-admin'] },
  { id: 'utility', commands: ['help', 'ping', 'serverinfo', 'userinfo', 'avatar'] },
];
const ALL_GROUPS = COMMAND_GROUPS.map((g) => g.id);

// Templates per catalog product type. Ready-made products are single-system:
// they expose ONLY their own module + commands (plus universal `utility`
// commands like /help, /ping). The "Modules" and "Messages" tabs are omitted
// because there's nothing else to toggle — the bot IS that one system.
// Multi-system bots are sold as `custom`, which unlocks everything.
const TEMPLATES = {
  // The Security bot is a focused "server guardian": moderation/auto-mod + a
  // verification gate + anti-nuke + welcome/auto-roles (edited in the Messages
  // tab). Only security-relevant modules — no reaction roles or leveling.
  moderation: {
    tabs: ['basics', 'modules', 'moderation', 'verification', 'antinuke', 'reactionroles', 'leveling', 'messages', 'commands'],
    modules: ['moderation', 'verification', 'antinuke', 'reactionroles', 'leveling', 'welcome'],
    commandGroups: ['moderation', 'verification', 'reactionroles', 'leveling', 'utility'],
  },
  // The FiveM bot: live server status, role whitelist, in-game reports and
  // scheduled restart announcements, plus welcome onboarding.
  fivem: {
    tabs: ['basics', 'modules', 'fivem', 'messages', 'commands'],
    modules: ['fivem', 'welcome'],
    commandGroups: ['fivem', 'utility'],
  },
  // Bespoke builds get everything by default; narrow per-bot via `features`.
  custom: {
    tabs: ALL_TABS,
    modules: ALL_MODULES,
    commandGroups: ALL_GROUPS,
  },
};

function defaultFeatures(type) {
  return TEMPLATES[type] || TEMPLATES.custom;
}

function pickList(val, allowed, fallback) {
  if (!Array.isArray(val)) return fallback;
  const out = [...new Set(val.filter((x) => allowed.includes(x)))];
  return out.length ? out : fallback;
}

/**
 * Effective capabilities for a bot row. An explicit per-bot `features` override
 * (custom builds) is clamped to known values; otherwise the type template wins.
 */
function resolveFeatures(bot) {
  const base = defaultFeatures(bot && bot.type);
  let override = bot && bot.features;
  if (typeof override === 'string') {
    try {
      override = JSON.parse(override);
    } catch {
      override = null;
    }
  }
  if (!override || typeof override !== 'object') return base;
  return {
    tabs: pickList(override.tabs, KNOWN_TABS, base.tabs),
    modules: pickList(override.modules, ALL_MODULES, base.modules),
    commandGroups: pickList(override.commandGroups, ALL_GROUPS, base.commandGroups),
  };
}

/**
 * Build a `features` override from a list of module keys — used when registering
 * a bespoke `custom` bot. Each module maps to its same-named command group (when
 * one exists); `utility` is always included. Returns null if nothing valid given.
 */
function featuresFromModules(moduleKeys) {
  const mods = [...new Set((moduleKeys || []).filter((k) => ALL_MODULES.includes(k)))];
  if (!mods.length) return null;
  const groups = [...new Set([...mods.filter((m) => ALL_GROUPS.includes(m)), 'utility'])];
  // Surface each enabled module's dedicated settings tab so the customer can
  // actually configure it (not just toggle it on/off).
  const sysTabs = mods.map((m) => MODULE_TABS[m]).filter(Boolean);
  const tabs = [...new Set([...ALL_TABS, ...sysTabs])];
  return { tabs, modules: mods, commandGroups: groups };
}

/** Set of command names allowed for the given resolved capabilities. */
function allowedCommands(features) {
  const groups = (features && features.commandGroups) || ALL_GROUPS;
  const set = new Set();
  for (const g of COMMAND_GROUPS) {
    if (groups.includes(g.id)) for (const c of g.commands) set.add(c);
  }
  return set;
}

module.exports = {
  ALL_TABS,
  ALL_MODULES,
  ALL_GROUPS,
  COMMAND_GROUPS,
  defaultFeatures,
  resolveFeatures,
  featuresFromModules,
  allowedCommands,
};
