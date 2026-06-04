'use strict';

const crypto = require('crypto');
const { defaultSettings } = require('./db');
const { allowedCommands } = require('./products');

const LANGS = ['en', 'es', 'fr', 'de', 'pt', 'nl', 'it'];
const MODULES = ['moderation', 'welcome', 'economy', 'music', 'tickets', 'leveling'];
const MATCH_MODES = ['contains', 'exact', 'startsWith', 'endsWith'];
const MOD_ACTIONS = ['timeout', 'mute', 'kick', 'ban'];
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
      },
    },
    roles: {
      muteRoleId: snowflake(rl.muteRoleId),
      modRoleIds: Array.isArray(rl.modRoleIds)
        ? [...new Set(rl.modRoleIds.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, MAX_MOD_ROLES)
        : [],
    },
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

  return {
    staffRoleIds: roleIds(i.staffRoleIds),
    categoryId: snowflake(i.categoryId),
    transcripts: { enabled: Boolean(tr.enabled), channelId: snowflake(tr.channelId) },
    claiming: Boolean(i.claiming),
    maxOpenPerUser: int(i.maxOpenPerUser, 1, 50, def.maxOpenPerUser),
    openMessage: str(i.openMessage, 1000, def.openMessage),
    panel: {
      title: str(pn.title, 256, def.panel.title),
      description: str(pn.description, 1000, def.panel.description),
      buttonLabel: str(pn.buttonLabel, 80, def.panel.buttonLabel) || def.panel.buttonLabel,
    },
    categories,
  };
}

/** Sanitize the economy-bot settings section against its defaults. */
function sanitizeEconomy(e, def) {
  const i = e && typeof e === 'object' ? e : {};
  const dy = i.daily || {};
  const wk = i.work || {};

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
    work: {
      enabled: Boolean(wk.enabled),
      min: int(wk.min, 0, 1_000_000, def.work.min),
      max: int(wk.max, 0, 1_000_000, def.work.max),
      cooldownSec: int(wk.cooldownSec, 0, 86_400, def.work.cooldownSec),
    },
    gambling: Boolean(i.gambling),
    leaderboard: Boolean(i.leaderboard),
    shop,
  };
}

/** Sanitize the music-bot settings section against its defaults. */
function sanitizeMusic(m, def) {
  const i = m && typeof m === 'object' ? m : {};
  return {
    defaultVolume: int(i.defaultVolume, 0, 200, def.defaultVolume),
    maxQueueLength: int(i.maxQueueLength, 1, 1000, def.maxQueueLength),
    djRoleIds: Array.isArray(i.djRoleIds)
      ? [...new Set(i.djRoleIds.filter((r) => /^\d{1,20}$/.test(String(r))).map(String))].slice(0, MAX_MOD_ROLES)
      : [],
    djOnly: Boolean(i.djOnly),
    autoLeaveSec: int(i.autoLeaveSec, 0, 3600, def.autoLeaveSec),
    allowFilters: Boolean(i.allowFilters),
    announceNowPlaying: Boolean(i.announceNowPlaying),
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

  // Messages — welcome/leave blocks + autoresponders
  const msg = i.messages || {};
  out.messages = {
    welcome: sanitizeMessageBlock(msg.welcome, d.messages.welcome),
    leave: sanitizeMessageBlock(msg.leave, d.messages.leave),
    autoresponses: sanitizeAutoresponses(msg.autoresponses),
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
  out.tickets = sanitizeTickets(i.tickets, d.tickets);
  out.economy = sanitizeEconomy(i.economy, d.economy);
  out.music = sanitizeMusic(i.music, d.music);

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
