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
  slowmode: ['channel', 'seconds', 'moderator'],
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
      voiceJoinLeave: boolean;
    };
  };
  roles: { muteRoleId: string; modRoleIds: string[] };
  dmOnPunish: boolean;
};

// Verification-gate tailored settings (a button members click to gain access).
export type VerificationSettings = {
  channelId: string;
  roleId: string;
  title: string;
  description: string;
  buttonLabel: string;
  successMessage: string;
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

// Ticket/support-bot tailored settings.
export type TicketCategory = { id: string; label: string; emoji: string };
export type TicketsSettings = {
  staffRoleIds: string[];
  pingRoleIds: string[];
  categoryId: string;
  transcripts: { enabled: boolean; channelId: string };
  claiming: boolean;
  maxOpenPerUser: number;
  autoClose: { enabled: boolean; hours: number };
  feedback: boolean;
  openMessage: string;
  panel: { title: string; description: string; buttonLabel: string };
  categories: TicketCategory[];
};

// Application-form settings.
export type AppQuestion = { id: string; label: string; style: 'short' | 'paragraph'; required: boolean };
export type AppForm = { id: string; name: string; description: string; questions: AppQuestion[] };
export type ApplicationsSettings = { reviewChannelId: string; approveRoleId: string; forms: AppForm[] };

// Auto-answering FAQ settings.
export type FaqEntry = { id: string; keywords: string[]; answer: string; match: 'contains' | 'exact' };
export type FaqSettings = { autoAnswer: boolean; entries: FaqEntry[] };

// Economy-bot tailored settings.
export type ShopItem = { id: string; name: string; price: number; roleId: string; description: string };
export type EconomySettings = {
  currencyName: string;
  currencySymbol: string;
  startingBalance: number;
  daily: { enabled: boolean; amount: number; streakBonus: number };
  weekly: { enabled: boolean; amount: number };
  work: { enabled: boolean; min: number; max: number; cooldownSec: number };
  rob: { enabled: boolean; successPercent: number; cooldownSec: number };
  payTax: number;
  gambling: boolean;
  leaderboard: boolean;
  shop: ShopItem[];
};

// Giveaways settings.
export type GiveawaysSettings = { managerRoleIds: string[]; requireRoleId: string };

// Music-bot tailored settings.
export type MusicSettings = {
  defaultVolume: number;
  maxQueueLength: number;
  maxTrackMinutes: number;
  djRoleIds: string[];
  djOnly: boolean;
  voteSkip: { enabled: boolean; percent: number };
  autoLeaveSec: number;
  stay247: boolean;
  allowFilters: boolean;
  announceNowPlaying: boolean;
};

// Saved-playlists settings.
export type PlaylistsSettings = { djOnly: boolean; maxPerGuild: number };

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
  tabs: ['basics', 'modules', 'messages', 'moderation', 'verification', 'reactionroles', 'antinuke', 'tickets', 'applications', 'faq', 'economy', 'giveaways', 'music', 'playlists', 'leveling', 'commands'],
  modules: ['moderation', 'verification', 'reactionroles', 'antinuke', 'welcome', 'economy', 'giveaways', 'music', 'playlists', 'tickets', 'applications', 'faq', 'leveling'],
  commandGroups: ['moderation', 'verification', 'reactionroles', 'economy', 'giveaways', 'music', 'playlists', 'tickets', 'applications', 'faq', 'leveling', 'utility'],
};

export const PRODUCT_SCOPES: Record<string, Features> = {
  moderation: {
    tabs: ['basics', 'modules', 'moderation', 'verification', 'reactionroles', 'antinuke', 'messages', 'leveling', 'commands'],
    modules: ['moderation', 'verification', 'reactionroles', 'antinuke', 'welcome', 'leveling'],
    commandGroups: ['moderation', 'verification', 'reactionroles', 'leveling', 'utility'],
  },
  tickets: {
    tabs: ['basics', 'modules', 'tickets', 'applications', 'faq', 'messages', 'commands'],
    modules: ['tickets', 'applications', 'faq', 'welcome'],
    commandGroups: ['tickets', 'applications', 'faq', 'utility'],
  },
  economy: {
    tabs: ['basics', 'modules', 'economy', 'leveling', 'giveaways', 'messages', 'commands'],
    modules: ['economy', 'leveling', 'giveaways', 'welcome'],
    commandGroups: ['economy', 'leveling', 'giveaways', 'utility'],
  },
  music: {
    tabs: ['basics', 'modules', 'music', 'playlists', 'leveling', 'messages', 'commands'],
    modules: ['music', 'playlists', 'leveling', 'welcome'],
    commandGroups: ['music', 'playlists', 'leveling', 'utility'],
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
        voiceJoinLeave: false,
      },
    },
    roles: { muteRoleId: '', modRoleIds: [] },
    dmOnPunish: false,
  };
}

export function defaultTickets(): TicketsSettings {
  return {
    staffRoleIds: [],
    pingRoleIds: [],
    categoryId: '',
    transcripts: { enabled: false, channelId: '' },
    claiming: false,
    maxOpenPerUser: 1,
    autoClose: { enabled: false, hours: 48 },
    feedback: false,
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
    weekly: { enabled: false, amount: 1000 },
    work: { enabled: true, min: 50, max: 200, cooldownSec: 3600 },
    rob: { enabled: false, successPercent: 50, cooldownSec: 86400 },
    payTax: 0,
    gambling: false,
    leaderboard: true,
    shop: [],
  };
}

export function defaultMusic(): MusicSettings {
  return {
    defaultVolume: 50,
    maxQueueLength: 100,
    maxTrackMinutes: 0,
    djRoleIds: [],
    djOnly: false,
    voteSkip: { enabled: false, percent: 50 },
    autoLeaveSec: 60,
    stay247: false,
    allowFilters: true,
    announceNowPlaying: true,
  };
}

export function defaultVerification(): VerificationSettings {
  return {
    channelId: '',
    roleId: '',
    title: 'Verify to continue',
    description: 'Click the button below to confirm you’re human and unlock the server.',
    buttonLabel: 'Verify',
    successMessage: 'You’re verified — welcome aboard! 🎉',
  };
}

export function defaultApplications(): ApplicationsSettings {
  return { reviewChannelId: '', approveRoleId: '', forms: [] };
}

export function defaultFaq(): FaqSettings {
  return { autoAnswer: true, entries: [] };
}

export function defaultReactionRoles(): ReactionRolesSettings {
  return { panels: [] };
}

export function defaultGiveaways(): GiveawaysSettings {
  return { managerRoleIds: [], requireRoleId: '' };
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

export function defaultPlaylists(): PlaylistsSettings {
  return { djOnly: false, maxPerGuild: 25 };
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
  messages: { welcome: MessageBlock; leave: MessageBlock; autoresponses: AutoResponse[]; autoRoleIds: string[] };
  commands: Record<string, CommandPerm>;
  moderation: ModerationSettings;
  verification: VerificationSettings;
  reactionRoles: ReactionRolesSettings;
  antiNuke: AntiNukeSettings;
  tickets: TicketsSettings;
  applications: ApplicationsSettings;
  faq: FaqSettings;
  economy: EconomySettings;
  giveaways: GiveawaysSettings;
  music: MusicSettings;
  playlists: PlaylistsSettings;
  leveling: LevelingSettings;
};

export const MODULES: { key: string; label: string; hint: string }[] = [
  { key: 'moderation', label: 'Moderation', hint: 'Auto-mod, warns, mutes, bans, logging' },
  { key: 'verification', label: 'Verification', hint: 'A button gate that grants access to verified members' },
  { key: 'reactionroles', label: 'Reaction Roles', hint: 'Let members self-assign roles from a button panel' },
  { key: 'antinuke', label: 'Anti-Nuke', hint: 'Stop mass bans/deletes by rogue or compromised admins' },
  { key: 'welcome', label: 'Welcome & Goodbye', hint: 'Greet new members and announce leaves' },
  { key: 'economy', label: 'Economy', hint: 'Currency, shop, gambling, leaderboards' },
  { key: 'giveaways', label: 'Giveaways', hint: 'Timed giveaways with entry button and reroll' },
  { key: 'music', label: 'Music', hint: 'Audio playback, queue and filters' },
  { key: 'playlists', label: 'Playlists', hint: 'Let members save and load queues as playlists' },
  { key: 'tickets', label: 'Tickets', hint: 'Support ticket panels and transcripts' },
  { key: 'applications', label: 'Applications', hint: 'Modal application forms with staff approve/deny' },
  { key: 'faq', label: 'FAQ', hint: 'Auto-answer common questions by keyword' },
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
  { module: 'moderation', label: 'Moderation', commands: ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'purge', 'lockdown', 'slowmode'] },
  { module: 'verification', label: 'Verification', commands: ['verify-panel'] },
  { module: 'reactionroles', label: 'Reaction Roles', commands: ['roles-panel'] },
  { module: 'economy', label: 'Economy', commands: ['balance', 'daily', 'work', 'pay', 'shop', 'leaderboard', 'coinflip', 'slots'] },
  { module: 'giveaways', label: 'Giveaways', commands: ['giveaway'] },
  { module: 'music', label: 'Music', commands: ['play', 'skip', 'stop', 'queue', 'volume', 'pause', 'resume', 'nowplaying', 'filter'] },
  { module: 'playlists', label: 'Playlists', commands: ['playlist'] },
  { module: 'tickets', label: 'Tickets', commands: ['ticket', 'close', 'add', 'remove'] },
  { module: 'applications', label: 'Applications', commands: ['apply'] },
  { module: 'faq', label: 'FAQ', commands: ['faq'] },
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
