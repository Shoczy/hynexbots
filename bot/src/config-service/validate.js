'use strict';

const crypto = require('crypto');
const { defaultSettings } = require('./db');
const { allowedCommands } = require('./products');

const LANGS = ['en', 'es', 'fr', 'de', 'pt', 'nl', 'it'];
const MODULES = ['moderation', 'verification', 'reactionroles', 'antinuke', 'welcome', 'economy', 'giveaways', 'music', 'playlists', 'tickets', 'applications', 'faq', 'leveling'];
const MATCH_MODES = ['contains', 'exact', 'startsWith', 'endsWith'];
const MOD_ACTIONS = ['timeout', 'mute', 'kick', 'ban'];
const NUKE_PUNISHMENTS = ['strip', 'ban', 'kick'];
const APP_STYLES = ['short', 'paragraph'];
const FAQ_MATCH = ['contains', 'exact'];

/** Keep a caller-supplied id if it's clean, otherwise mint a fresh one. */
const genId = (v) => (/^[\w-]{1,40}$/.test(String(v || '')) ? String(v) : crypto.randomUUID());
const MAX_AUTORESPONSES = 25;
const MAX_BANNED_WORDS = 200;
const MAX_ESCALATIONS = 10;
const MAX_MOD_ROLES = 25;

const str = (v, max, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : fallback);
const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const isSnowflake = (v) => typeof v === 'string' && /^\d{0,20}$/.test(v);
const snowflake = (v) => (isSnowflake(v) ? v : '');
/** Clamp to an integer within [min, max], falling back when not a finite number. */
const int = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
const url = (v, max = 512) =>
  typeof v === 'string' && (v === '' || /^https?:\/\/.+/i.test(v)) ? v.slice(0, max) : '';

/** Sanitize one welcome/leave message block. */
function sanitizeMessageBlock(m, def) {
  const b = m || {};
  const e = b.embed || {};
  return {
    enabled: Boolean(b.enabled),
    channelId: isSnowflake(b.channelId) ? b.channelId : '',
    text: str(b.text, 2000, ''),
    embed: {
      enabled: Boolean(e.enabled),
      title: str(e.title, 256, ''),
      description: str(e.description, 4000, ''),
      color: isHex(e.color) ? e.color : def.embed.color,
      image: url(e.image),
      footer: str(e.footer, 2048, ''),
    },
  };
}

function sanitizeAutoresponses(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list.slice(0, MAX_AUTORESPONSES)) {
    if (!raw || typeof raw !== 'object') continue;
    const trigger = str(raw.trigger, 100, '').trim();
    const reply = str(raw.reply, 2000, '').trim();
    if (!trigger || !reply) continue; // drop incomplete rows
    out.push({
      id: /^[\w-]{1,40}$/.test(String(raw.id || '')) ? String(raw.id) : crypto.randomUUID(),
      trigger,
      match: MATCH_MODES.includes(raw.match) ? raw.match : 'contains',
      reply,
      enabled: raw.enabled === undefined ? true : Boolean(raw.enabled),
    });
  }
  return out;
}

/**
 * Sanitize an optional per-command custom embed override. Returns a clean embed
 * object, or null if nothing usable was given (so we don't store empty blocks).
 */
function sanitizeCommandEmbed(e) {
  if (!e || typeof e !== 'object') return null;
  const title = str(e.title, 256, '').trim();
  const description = str(e.description, 4000, '').trim();
  const footer = str(e.footer, 2048, '').trim();
  const color = isHex(e.color) ? e.color : '';
  const enabled = Boolean(e.enabled);
  // Drop the block entirely if there's no content at all.
  if (!title && !description && !footer && !color && !enabled) return null;
  return { enabled, title, description, color, footer };
}

/** Sanitize the moderation-bot settings section against its defaults. */
function sanitizeModeration(m, def) {
  const i = m && typeof m === 'object' ? m : {};
  const am = i.automod || {};
  const ar = i.antiRaid || {};
  const wn = i.warnings || {};
  const lg = i.logging || {};
  const rl = i.roles || {};
  const ev = lg.events || {};

  const bannedWords = Array.isArray(am.bannedWords?.words)
    ? [...new Set(am.bannedWords.words.map((w) => str(w, 100, '').trim().toLowerCase()).filter(Boolean))].slice(
        0,
        MAX_BANNED_WORDS,
      )
    : [];

  const escalations = Array.isArray(wn.escalations)
    ? wn.escalations
        .filter((e) => e && typeof e === 'object')
        .map((e) => ({
          id: /^[\w-]{1,40}$/.test(String(e.id || '')) ? String(e.id) : crypto.randomUUID(),
          threshold: int(e.threshold, 1, 100, 3),
          action: MOD_ACTIONS.includes(e.action) ? e.action : 'mute',
        }))
        .slice(0, MAX_ESCALATIONS)
    : [];

  return {
    automod: {
      enabled: Boolean(am.enabled),
      antiSpam: {
        enabled: Boolean(am.antiSpam?.enabled),
        maxMessages: int(am.antiSpam?.maxMessages, 1, 50, def.automod.antiSpam.maxMessages),
        intervalSec: int(am.antiSpam?.intervalSec, 1, 60, def.automod.antiSpam.intervalSec),
      },
      antiInvites: Boolean(am.antiInvites),
      antiLinks: Boolean(am.antiLinks),
      massMention: {
        enabled: Boolean(am.massMention?.enabled),
        threshold: int(am.massMention?.threshold, 1, 50, def.automod.massMention.threshold),
      },
      capsFilter: {
        enabled: Boolean(am.capsFilter?.enabled),
        percent: int(am.capsFilter?.percent, 1, 100, def.automod.capsFilter.percent),
      },
      bannedWords: { enabled: Boolean(am.bannedWords?.enabled), words: bannedWords },
    },
    antiRaid: {
      enabled: Boolean(ar.enabled),
      minAccountAgeDays: int(ar.minAccountAgeDays, 0, 365, def.antiRaid.minAccountAgeDays),
      joinRate: {
        enabled: Boolean(ar.joinRate?.enabled),
        joins: int(ar.joinRate?.joins, 1, 100, def.antiRaid.joinRate.joins),
        perSeconds: int(ar.joinRate?.perSeconds, 1, 300, def.antiRaid.joinRate.perSeconds),
      },
    },
    warnings: {
      expireDays: int(wn.expireDays, 0, 365, def.warnings.expireDays),
      escalations,
    },
    logging: {
      channelId: snowflake(lg.channelId),
      events: {
        memberJoinLeave: Boolean(ev.memberJoinLeave),
        messageDelete: Boolean(ev.messageDelete),
        messageEdit: Boolean(ev.messageEdit),
        banKick: Boolean(ev.banKick),
        roleChange: Boolean(ev.roleChange),
        nicknameChange: Boolean(ev.nicknameChange),
        voiceJoinLeave: Boolean(ev.voiceJoinLeave),
      },
    },
    roles: {
      muteRoleId: snowflake(rl.muteRoleId),
      modRoleIds: Array.isArray(rl.modRoleIds)
        ? [...new Set(rl.modRoleIds.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, MAX_MOD_ROLES)
        : [],
    },
    dmOnPunish: Boolean(i.dmOnPunish),
  };
}

/** Sanitize the verification-gate settings section against its defaults. */
function sanitizeVerification(v, def) {
  const i = v && typeof v === 'object' ? v : {};
  return {
    channelId: snowflake(i.channelId),
    roleId: snowflake(i.roleId),
    title: str(i.title, 256, def.title) || def.title,
    description: str(i.description, 2000, def.description) || def.description,
    buttonLabel: str(i.buttonLabel, 80, def.buttonLabel) || def.buttonLabel,
    successMessage: str(i.successMessage, 1000, def.successMessage) || def.successMessage,
  };
}

/** Sanitize self-assign role panels. */
function sanitizeReactionRoles(r, def) {
  const i = r && typeof r === 'object' ? r : {};
  const genId = (v) => (/^[\w-]{1,40}$/.test(String(v || '')) ? String(v) : crypto.randomUUID());
  const panels = Array.isArray(i.panels)
    ? i.panels
        .filter((p) => p && typeof p === 'object')
        .slice(0, 10)
        .map((p) => ({
          id: genId(p.id),
          channelId: snowflake(p.channelId),
          title: str(p.title, 256, 'Pick your roles') || 'Pick your roles',
          description: str(p.description, 2000, ''),
          roles: Array.isArray(p.roles)
            ? p.roles
                .filter((x) => x && typeof x === 'object')
                .map((x) => ({
                  id: genId(x.id),
                  roleId: snowflake(x.roleId),
                  label: str(x.label, 80, '').trim(),
                  emoji: str(x.emoji, 32, '').trim(),
                }))
                .filter((x) => x.roleId && x.label)
                .slice(0, 25)
            : [],
        }))
    : [];
  return { panels };
}

/** Sanitize the anti-nuke settings section against its defaults. */
function sanitizeAntiNuke(a, def) {
  const i = a && typeof a === 'object' ? a : {};
  const lim = i.limits || {};
  const ids = (arr) =>
    Array.isArray(arr) ? [...new Set(arr.filter((x) => /^\d{1,20}$/.test(String(x))).map(String))].slice(0, MAX_MOD_ROLES) : [];
  const limit = (l, d) => ({
    enabled: l && l.enabled !== undefined ? Boolean(l.enabled) : d.enabled,
    max: int(l && l.max, 1, 100, d.max),
    perSeconds: int(l && l.perSeconds, 5, 600, d.perSeconds),
  });
  return {
    punishment: NUKE_PUNISHMENTS.includes(i.punishment) ? i.punishment : def.punishment,
    limits: {
      channelDelete: limit(lim.channelDelete, def.limits.channelDelete),
      roleDelete: limit(lim.roleDelete, def.limits.roleDelete),
      ban: limit(lim.ban, def.limits.ban),
      kick: limit(lim.kick, def.limits.kick),
    },
    whitelistUserIds: ids(i.whitelistUserIds),
    whitelistRoleIds: ids(i.whitelistRoleIds),
    alertChannelId: snowflake(i.alertChannelId),
  };
}

/** Sanitize the tickets-bot settings section against its defaults. */
function sanitizeTickets(t, def) {
  const i = t && typeof t === 'object' ? t : {};
  const tr = i.transcripts || {};
  const pn = i.panel || {};
  const roleIds = (arr) =>
    Array.isArray(arr) ? [...new Set(arr.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, MAX_MOD_ROLES) : [];

  const categories = Array.isArray(i.categories)
    ? i.categories
        .filter((c) => c && typeof c === 'object')
        .map((c) => ({
          id: /^[\w-]{1,40}$/.test(String(c.id || '')) ? String(c.id) : crypto.randomUUID(),
          label: str(c.label, 50, '').trim(),
          emoji: str(c.emoji, 16, '').trim(),
        }))
        .filter((c) => c.label)
        .slice(0, 20)
    : [];

  const ac = i.autoClose || {};
  return {
    staffRoleIds: roleIds(i.staffRoleIds),
    pingRoleIds: roleIds(i.pingRoleIds),
    categoryId: snowflake(i.categoryId),
    transcripts: { enabled: Boolean(tr.enabled), channelId: snowflake(tr.channelId) },
    claiming: Boolean(i.claiming),
    maxOpenPerUser: int(i.maxOpenPerUser, 1, 50, def.maxOpenPerUser),
    autoClose: { enabled: Boolean(ac.enabled), hours: int(ac.hours, 1, 720, def.autoClose.hours) },
    feedback: Boolean(i.feedback),
    openMessage: str(i.openMessage, 1000, def.openMessage),
    panel: {
      title: str(pn.title, 256, def.panel.title),
      description: str(pn.description, 1000, def.panel.description),
      buttonLabel: str(pn.buttonLabel, 80, def.panel.buttonLabel) || def.panel.buttonLabel,
    },
    categories,
  };
}

/** Sanitize application forms. */
function sanitizeApplications(a, def) {
  const i = a && typeof a === 'object' ? a : {};
  const forms = Array.isArray(i.forms)
    ? i.forms
        .filter((f) => f && typeof f === 'object')
        .slice(0, 10)
        .map((f) => ({
          id: genId(f.id),
          name: str(f.name, 80, '').trim() || 'Application',
          description: str(f.description, 500, ''),
          questions: Array.isArray(f.questions)
            ? f.questions
                .filter((q) => q && typeof q === 'object')
                .map((q) => ({
                  id: genId(q.id),
                  label: str(q.label, 45, '').trim(), // Discord modal label cap
                  style: APP_STYLES.includes(q.style) ? q.style : 'short',
                  required: q.required === undefined ? true : Boolean(q.required),
                }))
                .filter((q) => q.label)
                .slice(0, 5) // Discord modals allow max 5 inputs
            : [],
        }))
        .filter((f) => f.questions.length)
    : [];
  return { reviewChannelId: snowflake(i.reviewChannelId), approveRoleId: snowflake(i.approveRoleId), forms };
}

/** Sanitize the auto-answering FAQ settings. */
function sanitizeFaq(f, def) {
  const i = f && typeof f === 'object' ? f : {};
  const entries = Array.isArray(i.entries)
    ? i.entries
        .filter((e) => e && typeof e === 'object')
        .slice(0, 50)
        .map((e) => ({
          id: genId(e.id),
          keywords: Array.isArray(e.keywords)
            ? [...new Set(e.keywords.map((k) => str(k, 50, '').trim().toLowerCase()).filter(Boolean))].slice(0, 20)
            : [],
          answer: str(e.answer, 2000, '').trim(),
          match: FAQ_MATCH.includes(e.match) ? e.match : 'contains',
        }))
        .filter((e) => e.keywords.length && e.answer)
    : [];
  return { autoAnswer: i.autoAnswer === undefined ? true : Boolean(i.autoAnswer), entries };
}

/** Sanitize the economy-bot settings section against its defaults. */
function sanitizeEconomy(e, def) {
  const i = e && typeof e === 'object' ? e : {};
  const dy = i.daily || {};
  const wy = i.weekly || {};
  const wk = i.work || {};
  const rb = i.rob || {};

  const shop = Array.isArray(i.shop)
    ? i.shop
        .filter((s) => s && typeof s === 'object')
        .map((s) => ({
          id: /^[\w-]{1,40}$/.test(String(s.id || '')) ? String(s.id) : crypto.randomUUID(),
          name: str(s.name, 60, '').trim(),
          price: int(s.price, 0, 1_000_000_000, 0),
          roleId: snowflake(s.roleId),
          description: str(s.description, 200, '').trim(),
        }))
        .filter((s) => s.name)
        .slice(0, 50)
    : [];

  return {
    currencyName: str(i.currencyName, 24, def.currencyName).trim() || def.currencyName,
    currencySymbol: str(i.currencySymbol, 8, def.currencySymbol) || def.currencySymbol,
    startingBalance: int(i.startingBalance, 0, 1_000_000_000, def.startingBalance),
    daily: {
      enabled: Boolean(dy.enabled),
      amount: int(dy.amount, 0, 1_000_000, def.daily.amount),
      streakBonus: int(dy.streakBonus, 0, 1_000_000, def.daily.streakBonus),
    },
    weekly: {
      enabled: Boolean(wy.enabled),
      amount: int(wy.amount, 0, 1_000_000, def.weekly.amount),
    },
    work: {
      enabled: Boolean(wk.enabled),
      min: int(wk.min, 0, 1_000_000, def.work.min),
      max: int(wk.max, 0, 1_000_000, def.work.max),
      cooldownSec: int(wk.cooldownSec, 0, 86_400, def.work.cooldownSec),
    },
    rob: {
      enabled: Boolean(rb.enabled),
      successPercent: int(rb.successPercent, 0, 100, def.rob.successPercent),
      cooldownSec: int(rb.cooldownSec, 0, 604_800, def.rob.cooldownSec),
    },
    payTax: int(i.payTax, 0, 50, def.payTax),
    gambling: Boolean(i.gambling),
    leaderboard: Boolean(i.leaderboard),
    shop,
  };
}

/** Sanitize the giveaways settings section against its defaults. */
function sanitizeGiveaways(g, def) {
  const i = g && typeof g === 'object' ? g : {};
  return {
    managerRoleIds: Array.isArray(i.managerRoleIds)
      ? [...new Set(i.managerRoleIds.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, MAX_MOD_ROLES)
      : [],
    requireRoleId: snowflake(i.requireRoleId),
  };
}

/** Sanitize the music-bot settings section against its defaults. */
function sanitizeMusic(m, def) {
  const i = m && typeof m === 'object' ? m : {};
  const vs = i.voteSkip || {};
  return {
    defaultVolume: int(i.defaultVolume, 0, 200, def.defaultVolume),
    maxQueueLength: int(i.maxQueueLength, 1, 1000, def.maxQueueLength),
    maxTrackMinutes: int(i.maxTrackMinutes, 0, 1440, def.maxTrackMinutes),
    djRoleIds: Array.isArray(i.djRoleIds)
      ? [...new Set(i.djRoleIds.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, MAX_MOD_ROLES)
      : [],
    djOnly: Boolean(i.djOnly),
    voteSkip: { enabled: Boolean(vs.enabled), percent: int(vs.percent, 1, 100, def.voteSkip.percent) },
    autoLeaveSec: int(i.autoLeaveSec, 0, 3600, def.autoLeaveSec),
    stay247: Boolean(i.stay247),
    allowFilters: Boolean(i.allowFilters),
    announceNowPlaying: Boolean(i.announceNowPlaying),
  };
}

/** Sanitize the saved-playlists settings section. */
function sanitizePlaylists(p, def) {
  const i = p && typeof p === 'object' ? p : {};
  return {
    djOnly: Boolean(i.djOnly),
    maxPerGuild: int(i.maxPerGuild, 1, 200, def.maxPerGuild),
  };
}

/** Sanitize the leveling-bot settings section against its defaults. */
function sanitizeLeveling(l, def) {
  const i = l && typeof l === 'object' ? l : {};
  const xp = i.xpPerMessage || {};
  const lu = i.levelUp || {};
  const min = int(xp.min, 0, 1000, def.xpPerMessage.min);
  const max = int(xp.max, 0, 1000, def.xpPerMessage.max);

  const rewards = Array.isArray(i.rewards)
    ? i.rewards
        .filter((r) => r && typeof r === 'object')
        .map((r) => ({
          id: /^[\w-]{1,40}$/.test(String(r.id || '')) ? String(r.id) : crypto.randomUUID(),
          level: int(r.level, 1, 1000, 1),
          roleId: snowflake(r.roleId),
        }))
        .filter((r) => r.roleId)
        .slice(0, 50)
    : [];

  return {
    xpPerMessage: { min, max: Math.max(min, max) },
    cooldownSec: int(i.cooldownSec, 0, 3600, def.cooldownSec),
    levelUp: {
      enabled: Boolean(lu.enabled),
      channelId: snowflake(lu.channelId),
      message: str(lu.message, 1000, def.levelUp.message) || def.levelUp.message,
    },
    stackRewards: Boolean(i.stackRewards),
    rewards,
    noXpRoleIds: Array.isArray(i.noXpRoleIds)
      ? [...new Set(i.noXpRoleIds.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, MAX_MOD_ROLES)
      : [],
  };
}

/**
 * Whitelist-sanitize an incoming settings object. Anything unknown or the
 * wrong type is dropped/clamped — we never trust the dashboard payload blindly.
 *
 * `features` (optional) is the bot's resolved capability scope
 * ({ modules, commandGroups }). When given, modules outside the scope are
 * forced off and commands outside it are dropped, so a tampered payload can't
 * enable features the customer's product doesn't include.
 */
function sanitizeSettings(input, features = null) {
  const d = defaultSettings();
  const out = d;
  const i = input || {};
  const allowedModules = features && Array.isArray(features.modules) ? new Set(features.modules) : null;
  const allowedCmds = features ? allowedCommands(features) : null;

  // Basics
  const b = i.basics || {};
  out.basics = {
    prefix: str(b.prefix, 5, d.basics.prefix) || d.basics.prefix,
    embedColor: isHex(b.embedColor) ? b.embedColor : d.basics.embedColor,
    nickname: str(b.nickname, 32, d.basics.nickname),
    language: LANGS.includes(b.language) ? b.language : d.basics.language,
    logChannelId: isSnowflake(b.logChannelId) ? b.logChannelId : '',
  };

  // Modules — booleans only; forced off if outside the product's scope.
  const m = i.modules || {};
  out.modules = {};
  for (const key of MODULES) {
    out.modules[key] = allowedModules && !allowedModules.has(key) ? false : Boolean(m[key]);
  }

  // Messages — welcome/leave blocks + autoresponders + auto-roles
  const msg = i.messages || {};
  out.messages = {
    welcome: sanitizeMessageBlock(msg.welcome, d.messages.welcome),
    leave: sanitizeMessageBlock(msg.leave, d.messages.leave),
    autoresponses: sanitizeAutoresponses(msg.autoresponses),
    autoRoleIds: Array.isArray(msg.autoRoleIds)
      ? [...new Set(msg.autoRoleIds.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, MAX_MOD_ROLES)
      : [],
  };

  // Commands — per command: { enabled, roles[], embed? }. Empty roles = everyone.
  // `embed` is an optional custom reply override the running bot renders (with
  // {variable} substitution) instead of its built-in response.
  out.commands = {};
  if (i.commands && typeof i.commands === 'object') {
    for (const [k, v] of Object.entries(i.commands)) {
      if (!/^[\w-]{1,32}$/.test(k) || !v || typeof v !== 'object') continue;
      if (allowedCmds && !allowedCmds.has(k)) continue; // outside the product's scope
      const roles = Array.isArray(v.roles)
        ? [...new Set(v.roles.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, 25)
        : [];
      out.commands[k] = { enabled: v.enabled === undefined ? true : Boolean(v.enabled), roles };
      const emb = sanitizeCommandEmbed(v.embed);
      if (emb) out.commands[k].embed = emb;
    }
  }

  // Per-product tailored settings.
  out.moderation = sanitizeModeration(i.moderation, d.moderation);
  out.verification = sanitizeVerification(i.verification, d.verification);
  out.reactionRoles = sanitizeReactionRoles(i.reactionRoles, d.reactionRoles);
  out.antiNuke = sanitizeAntiNuke(i.antiNuke, d.antiNuke);
  out.tickets = sanitizeTickets(i.tickets, d.tickets);
  out.applications = sanitizeApplications(i.applications, d.applications);
  out.faq = sanitizeFaq(i.faq, d.faq);
  out.economy = sanitizeEconomy(i.economy, d.economy);
  out.giveaways = sanitizeGiveaways(i.giveaways, d.giveaways);
  out.music = sanitizeMusic(i.music, d.music);
  out.playlists = sanitizePlaylists(i.playlists, d.playlists);
  out.leveling = sanitizeLeveling(i.leveling, d.leveling);

  return out;
}

/**
 * Sanitize a guild-sync payload the running bot POSTs (its roles & channels),
 * so the dashboard can offer real pick-lists instead of raw ID fields.
 */
function sanitizeGuildSync(input) {
  const i = input || {};
  const roles = Array.isArray(i.roles)
    ? i.roles
        .filter((r) => r && /^\d{1,20}$/.test(String(r.id)))
        .map((r) => ({
          id: String(r.id),
          name: str(r.name, 100, '').trim() || 'role',
          color: int(r.color, 0, 0xffffff, 0),
          position: int(r.position, 0, 1000, 0),
          managed: Boolean(r.managed),
        }))
        .sort((a, b) => b.position - a.position)
        .slice(0, 250)
    : [];
  const channels = Array.isArray(i.channels)
    ? i.channels
        .filter((c) => c && /^\d{1,20}$/.test(String(c.id)))
        .map((c) => ({ id: String(c.id), name: str(c.name, 100, '').trim() || 'channel', type: int(c.type, 0, 100, 0) }))
        .slice(0, 500)
    : [];
  return {
    guildId: isSnowflake(i.guildId) ? String(i.guildId) : '',
    guildName: str(i.guildName, 100, '').trim(),
    roles,
    channels,
  };
}

module.exports = { sanitizeSettings, sanitizeGuildSync, LANGS, MODULES, MATCH_MODES };
