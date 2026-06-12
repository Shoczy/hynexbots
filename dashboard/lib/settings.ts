// Shared settings types + constants for the editor UI.

import { type V2Message, emptyV2Message } from './blocks';

export type Embed = {
  enabled: boolean;
  title: string;
  description: string;
  color: string;
  image: string;
  footer: string;
};

export type MessageBlock = {
  enabled: boolean;
  channelId: string;
  /** The message body, designed in the block builder. */
  v2?: V2Message;
};

export type AutoResponse = {
  id: string;
  trigger: string;
  match: string;
  enabled: boolean;
  /** The reply body, designed in the block builder. */
  v2?: V2Message;
};

export type Announcement = {
  id: string;
  enabled: boolean;
  channelId: string;
  everyMinutes: number;
  /** The message body, designed in the block builder. */
  v2?: V2Message;
};

export type CommandEmbed = {
  enabled: boolean;
  title: string;
  description: string;
  color: string;
  footer: string;
  /** Optional Components V2 reply designed in the block builder. */
  v2?: V2Message;
};
export type CommandPerm = { enabled: boolean; roles: string[]; embed?: CommandEmbed };

export function emptyCommandEmbed(): CommandEmbed {
  return { enabled: false, title: '', description: '', color: '', footer: '', v2: emptyV2Message() };
}

/**
 * Variables each command can use inside its custom reply embed. The running bot
 * substitutes {name} with live data. {server} and {user} work almost everywhere.
 */
export const COMMAND_VARIABLES: Record<string, string[]> = {
  // moderation
  ban: ['user', 'moderator', 'reason', 'server'],
  kick: ['user', 'moderator', 'reason', 'server'],
  mute: ['user', 'moderator', 'reason', 'duration', 'server'],
  unmute: ['user', 'moderator', 'server'],
  warn: ['user', 'moderator', 'reason', 'count', 'server'],
  warnings: ['user', 'count', 'server'],
  purge: ['count', 'channel', 'moderator'],
  lockdown: ['channel', 'moderator'],
  slowmode: ['channel', 'seconds', 'moderator'],
  // fivem
  status: ['server', 'players', 'maxPlayers', 'hostname'],
  players: ['server', 'players', 'maxPlayers'],
  whitelist: ['user', 'target', 'moderator'],
  restart: ['server', 'minutes'],
  // utility
  help: ['server', 'user'],
  ping: ['latency', 'user'],
  serverinfo: ['server'],
  userinfo: ['user'],
  avatar: ['user'],
};

export type ModAction = 'timeout' | 'mute' | 'kick' | 'ban';
export type WarnEscalation = { id: string; threshold: number; action: ModAction };

// Moderation-bot tailored settings.
export type ModerationSettings = {
  automod: {
    enabled: boolean;
    antiSpam: { enabled: boolean; maxMessages: number; intervalSec: number };
    antiInvites: boolean;
    antiLinks: boolean;
    massMention: { enabled: boolean; threshold: number };
    capsFilter: { enabled: boolean; percent: number };
    bannedWords: { enabled: boolean; words: string[] };
    scamLinks: { enabled: boolean; extraDomains: string[] };
  };
  antiRaid: {
    enabled: boolean;
    minAccountAgeDays: number;
    joinRate: { enabled: boolean; joins: number; perSeconds: number };
  };
  autoSlowmode: {
    enabled: boolean;
    messages: number;
    perSeconds: number;
    slowmodeSeconds: number;
    cooldownSeconds: number;
    channelIds: string[];
  };
  warnings: { expireDays: number; escalations: WarnEscalation[] };
  logging: {
    channelId: string;
    events: {
      memberJoinLeave: boolean;
      messageDelete: boolean;
      messageEdit: boolean;
      banKick: boolean;
      roleChange: boolean;
      nicknameChange: boolean;
      voiceJoinLeave: boolean;
    };
  };
  roles: { muteRoleId: string; modRoleIds: string[] };
  dmOnPunish: boolean;
  banAppeal: { enabled: boolean; channelId: string };
  modmail: { enabled: boolean; channelId: string; pingRoleId: string };
};

// Verification-gate tailored settings (a button members click to gain access).
export type VerificationSettings = {
  channelId: string;
  roleId: string;
  buttonLabel: string;
  successMessage: string;
  /** Panel content, designed in the block builder (the Verify button is appended). */
  v2?: V2Message;
};

// Self-assign role panels.
export type ReactionRole = { id: string; roleId: string; label: string; emoji: string };
export type ReactionRolePanel = { id: string; channelId: string; title: string; description: string; roles: ReactionRole[] };
export type ReactionRolesSettings = { panels: ReactionRolePanel[] };

// Anti-nuke settings.
export type NukeLimit = { enabled: boolean; max: number; perSeconds: number };
export type AntiNukeSettings = {
  punishment: 'strip' | 'ban' | 'kick';
  limits: { channelDelete: NukeLimit; roleDelete: NukeLimit; ban: NukeLimit; kick: NukeLimit };
  whitelistUserIds: string[];
  whitelistRoleIds: string[];
  alertChannelId: string;
};

// FiveM-bot tailored settings.
export type FiveMSettings = {
  server: { host: string; name: string };
  status: { enabled: boolean; channelId: string; refreshSec: number };
  whitelist: {
    enabled: boolean;
    roleId: string;
    logChannelId: string;
    application: { enabled: boolean; panelChannelId: string; reviewChannelId: string };
  };
  reports: { enabled: boolean; channelId: string; pingRoleId: string };
  restarts: { enabled: boolean; channelId: string; times: string[]; warnMinutes: number[] };
  monitor: { enabled: boolean; channelId: string; pingRoleId: string; downChecks: number };
  playtime: { enabled: boolean };
  chatBridge: { enabled: boolean; channelId: string };
};

// Leveling-bot tailored settings.
export type LevelReward = { id: string; level: number; roleId: string };
export type LevelingSettings = {
  xpPerMessage: { min: number; max: number };
  cooldownSec: number;
  levelUp: { enabled: boolean; channelId: string; message: string };
  stackRewards: boolean;
  rewards: LevelReward[];
  noXpRoleIds: string[];
};

// Capability scope for a bot, resolved server-side from its product type.
// Scopes which editor tabs, modules and command groups the customer sees.
export type Features = {
  tabs: string[];
  modules: string[];
  commandGroups: string[];
};

// Client-side fallback scope, keyed by product type. The server sends the
// authoritative `features`; this is used when an older service doesn't, so the
// editor never shows unrelated systems. MUST stay in sync with the bot's
// source of truth: bot/src/config-service/products.js (TEMPLATES).
const ALL_FEATURES: Features = {
  tabs: ['basics', 'modules', 'messages', 'moderation', 'verification', 'reactionroles', 'antinuke', 'leveling', 'fivem', 'commands'],
  modules: ['moderation', 'verification', 'reactionroles', 'antinuke', 'welcome', 'leveling', 'fivem'],
  commandGroups: ['moderation', 'verification', 'reactionroles', 'leveling', 'fivem', 'utility'],
};

export const PRODUCT_SCOPES: Record<string, Features> = {
  // Sold as "Security" — only security-relevant modules.
  moderation: {
    tabs: ['basics', 'modules', 'moderation', 'verification', 'antinuke', 'messages', 'commands'],
    modules: ['moderation', 'verification', 'antinuke', 'welcome'],
    commandGroups: ['moderation', 'verification', 'utility'],
  },
  fivem: {
    tabs: ['basics', 'modules', 'fivem', 'messages', 'commands'],
    modules: ['fivem', 'welcome'],
    commandGroups: ['fivem', 'utility'],
  },
};

/** Effective scope for a bot: server `features` win; otherwise fall back by type. */
export function effectiveFeatures(type?: string, features?: Features): Features {
  if (features && Array.isArray(features.tabs)) return features;
  return (type && PRODUCT_SCOPES[type]) || ALL_FEATURES;
}

// Fallback used when an older backend returns settings without a `moderation`
// section, so the editor renders instead of crashing. Mirrors the bot's
// moderationDefaults() in bot/src/config-service/db.js.
export function defaultModeration(): ModerationSettings {
  return {
    automod: {
      enabled: false,
      antiSpam: { enabled: false, maxMessages: 5, intervalSec: 5 },
      antiInvites: false,
      antiLinks: false,
      massMention: { enabled: false, threshold: 5 },
      capsFilter: { enabled: false, percent: 70 },
      bannedWords: { enabled: false, words: [] },
      scamLinks: { enabled: false, extraDomains: [] },
    },
    antiRaid: { enabled: false, minAccountAgeDays: 0, joinRate: { enabled: false, joins: 10, perSeconds: 10 } },
    autoSlowmode: { enabled: false, messages: 20, perSeconds: 10, slowmodeSeconds: 5, cooldownSeconds: 60, channelIds: [] },
    warnings: { expireDays: 0, escalations: [] },
    logging: {
      channelId: '',
      events: {
        memberJoinLeave: false,
        messageDelete: false,
        messageEdit: false,
        banKick: false,
        roleChange: false,
        nicknameChange: false,
        voiceJoinLeave: false,
      },
    },
    roles: { muteRoleId: '', modRoleIds: [] },
    dmOnPunish: false,
    banAppeal: { enabled: false, channelId: '' },
    modmail: { enabled: false, channelId: '', pingRoleId: '' },
  };
}

export function defaultFiveM(): FiveMSettings {
  return {
    server: { host: '', name: '' },
    status: { enabled: false, channelId: '', refreshSec: 60 },
    whitelist: { enabled: false, roleId: '', logChannelId: '', application: { enabled: false, panelChannelId: '', reviewChannelId: '' } },
    reports: { enabled: false, channelId: '', pingRoleId: '' },
    restarts: { enabled: false, channelId: '', times: [], warnMinutes: [15, 5, 1] },
    monitor: { enabled: false, channelId: '', pingRoleId: '', downChecks: 2 },
    playtime: { enabled: false },
    chatBridge: { enabled: false, channelId: '' },
  };
}

export function defaultVerification(): VerificationSettings {
  return {
    channelId: '',
    roleId: '',
    buttonLabel: 'Verify',
    successMessage: 'You’re verified — welcome aboard! 🎉',
    v2: {
      enabled: false,
      accent: '',
      blocks: [
        { id: 'verify-title', type: 'text', content: '## Verify to continue' },
        { id: 'verify-desc', type: 'text', content: 'Click the button below to confirm you’re human and unlock the server.' },
      ],
    },
  };
}

export function defaultReactionRoles(): ReactionRolesSettings {
  return { panels: [] };
}

export function defaultAntiNuke(): AntiNukeSettings {
  return {
    punishment: 'strip',
    limits: {
      channelDelete: { enabled: true, max: 3, perSeconds: 30 },
      roleDelete: { enabled: true, max: 3, perSeconds: 30 },
      ban: { enabled: true, max: 5, perSeconds: 30 },
      kick: { enabled: true, max: 5, perSeconds: 30 },
    },
    whitelistUserIds: [],
    whitelistRoleIds: [],
    alertChannelId: '',
  };
}

export function defaultLeveling(): LevelingSettings {
  return {
    xpPerMessage: { min: 15, max: 25 },
    cooldownSec: 60,
    levelUp: { enabled: true, channelId: '', message: 'GG {user}, you reached level {level}! 🎉' },
    stackRewards: true,
    rewards: [],
    noXpRoleIds: [],
  };
}

export type Settings = {
  basics: { prefix: string; embedColor: string; nickname: string; language: string; logChannelId: string };
  modules: Record<string, boolean>;
  messages: { welcome: MessageBlock; leave: MessageBlock; autoresponses: AutoResponse[]; announcements: Announcement[]; autoRoleIds: string[] };
  commands: Record<string, CommandPerm>;
  moderation: ModerationSettings;
  verification: VerificationSettings;
  reactionRoles: ReactionRolesSettings;
  antiNuke: AntiNukeSettings;
  leveling: LevelingSettings;
  fivem: FiveMSettings;
};

export const MODULES: { key: string; label: string; hint: string }[] = [
  { key: 'moderation', label: 'Moderation', hint: 'Auto-mod, warns, mutes, bans, logging' },
  { key: 'verification', label: 'Verification', hint: 'A button gate that grants access to verified members' },
  { key: 'reactionroles', label: 'Reaction Roles', hint: 'Let members self-assign roles from a button panel' },
  { key: 'antinuke', label: 'Anti-Nuke', hint: 'Stop mass bans/deletes by rogue or compromised admins' },
  { key: 'welcome', label: 'Welcome & Goodbye', hint: 'Greet new members and announce leaves' },
  { key: 'leveling', label: 'Leveling', hint: 'XP, ranks and level-up rewards' },
  { key: 'fivem', label: 'FiveM', hint: 'Server status, whitelist, in-game reports & restart alerts' },
];

export const LANGS: [string, string][] = [
  ['en', 'English'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['pt', 'Português'],
  ['nl', 'Nederlands'],
  ['it', 'Italiano'],
];

export const MATCH_MODES: [string, string][] = [
  ['contains', 'contains'],
  ['exact', 'is exactly'],
  ['startsWith', 'starts with'],
  ['endsWith', 'ends with'],
];

// Command catalog shown in the permissions editor, grouped by module.
// Must list EVERY command each product bot ships (kept in sync with the backend
// COMMAND_GROUPS in bot/src/config-service/products.js).
export const COMMAND_GROUPS: { module: string; label: string; commands: string[] }[] = [
  { module: 'moderation', label: 'Moderation', commands: ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'purge', 'lockdown', 'slowmode', 'temprole'] },
  { module: 'verification', label: 'Verification', commands: ['verify-panel'] },
  { module: 'reactionroles', label: 'Reaction Roles', commands: ['roles-panel'] },
  { module: 'leveling', label: 'Leveling', commands: ['rank', 'levels', 'setxp'] },
  { module: 'fivem', label: 'FiveM', commands: ['status', 'players', 'whitelist', 'restart', 'playtime', 'playtime-top'] },
  { module: 'utility', label: 'Utility', commands: ['help', 'ping', 'serverinfo', 'userinfo', 'avatar'] },
];

export const VARIABLES: { token: string; desc: string }[] = [
  { token: '{user}', desc: 'Mentions the member' },
  { token: '{username}', desc: 'Their username' },
  { token: '{server}', desc: 'Server name' },
  { token: '{memberCount}', desc: 'Member count' },
  { token: '{memberName}', desc: 'Their display name' },
];
