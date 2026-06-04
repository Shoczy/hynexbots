// Shared settings types + constants for the editor UI.

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
  text: string;
  embed: Embed;
};

export type AutoResponse = {
  id: string;
  trigger: string;
  match: string;
  reply: string;
  enabled: boolean;
};

export type CommandEmbed = {
  enabled: boolean;
  title: string;
  description: string;
  color: string;
  footer: string;
};
export type CommandPerm = { enabled: boolean; roles: string[]; embed?: CommandEmbed };

export function emptyCommandEmbed(): CommandEmbed {
  return { enabled: false, title: '', description: '', color: '', footer: '' };
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
  // economy
  balance: ['user', 'balance', 'currency', 'symbol', 'server'],
  daily: ['user', 'amount', 'streak', 'balance', 'currency', 'symbol'],
  work: ['user', 'amount', 'balance', 'currency', 'symbol'],
  pay: ['user', 'target', 'amount', 'currency', 'symbol'],
  coinflip: ['user', 'amount', 'result', 'balance', 'currency', 'symbol'],
  slots: ['user', 'amount', 'result', 'balance', 'currency', 'symbol'],
  leaderboard: ['server'],
  shop: ['server'],
  // music
  play: ['title', 'url', 'duration', 'requester'],
  skip: ['title', 'user'],
  nowplaying: ['title', 'url', 'duration', 'requester'],
  volume: ['volume', 'user'],
  stop: ['user'],
  pause: ['user'],
  resume: ['user'],
  queue: ['server'],
  filter: ['filter', 'user'],
  // tickets
  ticket: ['user', 'server'],
  close: ['user', 'channel'],
  add: ['user', 'target'],
  remove: ['user', 'target'],
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
  };
  antiRaid: {
    enabled: boolean;
    minAccountAgeDays: number;
    joinRate: { enabled: boolean; joins: number; perSeconds: number };
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
    };
  };
  roles: { muteRoleId: string; modRoleIds: string[] };
};

// Ticket/support-bot tailored settings.
export type TicketCategory = { id: string; label: string; emoji: string };
export type TicketsSettings = {
  staffRoleIds: string[];
  categoryId: string;
  transcripts: { enabled: boolean; channelId: string };
  claiming: boolean;
  maxOpenPerUser: number;
  openMessage: string;
  panel: { title: string; description: string; buttonLabel: string };
  categories: TicketCategory[];
};

// Economy-bot tailored settings.
export type ShopItem = { id: string; name: string; price: number; roleId: string; description: string };
export type EconomySettings = {
  currencyName: string;
  currencySymbol: string;
  startingBalance: number;
  daily: { enabled: boolean; amount: number; streakBonus: number };
  work: { enabled: boolean; min: number; max: number; cooldownSec: number };
  gambling: boolean;
  leaderboard: boolean;
  shop: ShopItem[];
};

// Music-bot tailored settings.
export type MusicSettings = {
  defaultVolume: number;
  maxQueueLength: number;
  djRoleIds: string[];
  djOnly: boolean;
  autoLeaveSec: number;
  allowFilters: boolean;
  announceNowPlaying: boolean;
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
  tabs: ['basics', 'modules', 'messages', 'commands'],
  modules: ['moderation', 'welcome', 'economy', 'music', 'tickets', 'leveling'],
  commandGroups: ['moderation', 'economy', 'music', 'tickets', 'leveling', 'utility'],
};

export const PRODUCT_SCOPES: Record<string, Features> = {
  moderation: { tabs: ['basics', 'moderation', 'commands'], modules: ['moderation'], commandGroups: ['moderation', 'utility'] },
  tickets: { tabs: ['basics', 'tickets', 'commands'], modules: ['tickets'], commandGroups: ['tickets', 'utility'] },
  economy: { tabs: ['basics', 'economy', 'commands'], modules: ['economy'], commandGroups: ['economy', 'utility'] },
  music: { tabs: ['basics', 'music', 'commands'], modules: ['music'], commandGroups: ['music', 'utility'] },
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
    },
    antiRaid: { enabled: false, minAccountAgeDays: 0, joinRate: { enabled: false, joins: 10, perSeconds: 10 } },
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
      },
    },
    roles: { muteRoleId: '', modRoleIds: [] },
  };
}

export function defaultTickets(): TicketsSettings {
  return {
    staffRoleIds: [],
    categoryId: '',
    transcripts: { enabled: false, channelId: '' },
    claiming: false,
    maxOpenPerUser: 1,
    openMessage: 'Thanks for reaching out — a staff member will be with you shortly.',
    panel: {
      title: 'Need help?',
      description: 'Click the button below to open a support ticket.',
      buttonLabel: 'Open a ticket',
    },
    categories: [],
  };
}

export function defaultEconomy(): EconomySettings {
  return {
    currencyName: 'coins',
    currencySymbol: '🪙',
    startingBalance: 100,
    daily: { enabled: true, amount: 250, streakBonus: 50 },
    work: { enabled: true, min: 50, max: 200, cooldownSec: 3600 },
    gambling: false,
    leaderboard: true,
    shop: [],
  };
}

export function defaultMusic(): MusicSettings {
  return {
    defaultVolume: 50,
    maxQueueLength: 100,
    djRoleIds: [],
    djOnly: false,
    autoLeaveSec: 60,
    allowFilters: true,
    announceNowPlaying: true,
  };
}

export type Settings = {
  basics: { prefix: string; embedColor: string; nickname: string; language: string; logChannelId: string };
  modules: Record<string, boolean>;
  messages: { welcome: MessageBlock; leave: MessageBlock; autoresponses: AutoResponse[] };
  commands: Record<string, CommandPerm>;
  moderation: ModerationSettings;
  tickets: TicketsSettings;
  economy: EconomySettings;
  music: MusicSettings;
};

export const MODULES: { key: string; label: string; hint: string }[] = [
  { key: 'moderation', label: 'Moderation', hint: 'Auto-mod, warns, mutes, bans, logging' },
  { key: 'welcome', label: 'Welcome & Goodbye', hint: 'Greet new members and announce leaves' },
  { key: 'economy', label: 'Economy', hint: 'Currency, shop, gambling, leaderboards' },
  { key: 'music', label: 'Music', hint: 'Audio playback, queue and filters' },
  { key: 'tickets', label: 'Tickets', hint: 'Support ticket panels and transcripts' },
  { key: 'leveling', label: 'Leveling', hint: 'XP, ranks and level-up rewards' },
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
  { module: 'moderation', label: 'Moderation', commands: ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'purge', 'lockdown'] },
  { module: 'economy', label: 'Economy', commands: ['balance', 'daily', 'work', 'pay', 'shop', 'leaderboard', 'coinflip', 'slots'] },
  { module: 'music', label: 'Music', commands: ['play', 'skip', 'stop', 'queue', 'volume', 'pause', 'resume', 'nowplaying', 'filter'] },
  { module: 'tickets', label: 'Tickets', commands: ['ticket', 'close', 'add', 'remove'] },
  { module: 'leveling', label: 'Leveling', commands: ['rank', 'levels', 'setxp'] },
  { module: 'utility', label: 'Utility', commands: ['help', 'ping', 'serverinfo', 'userinfo', 'avatar'] },
];

export const VARIABLES: { token: string; desc: string }[] = [
  { token: '{user}', desc: 'Mentions the member' },
  { token: '{username}', desc: 'Their username' },
  { token: '{server}', desc: 'Server name' },
  { token: '{memberCount}', desc: 'Member count' },
  { token: '{memberName}', desc: 'Their display name' },
];
