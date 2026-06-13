'use strict';

const crypto = require('crypto');
const { defaultSettings } = require('./db');
const { allowedCommands } = require('./products');

const LANGS = ['en', 'es', 'fr', 'de', 'pt', 'nl', 'it'];
const MODULES = ['moderation', 'verification', 'reactionroles', 'antinuke', 'welcome', 'leveling', 'fivem'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // 24h HH:MM
const MATCH_MODES = ['contains', 'exact', 'startsWith', 'endsWith'];
const MOD_ACTIONS = ['timeout', 'mute', 'kick', 'ban'];
const NUKE_PUNISHMENTS = ['strip', 'ban', 'kick'];

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

const MAX_BLOCKS = 25;
const MAX_BLOCK_BUTTONS = 5;

/**
 * Sanitize a Components V2 message: an ordered list of text / separator / image
 * / link-button blocks designed in the dashboard block builder. Always returns a
 * stable `{ enabled, accent, blocks }` shape (never null) so the field persists.
 * Buttons are link-only (label + http(s) url) — the only kind that works without
 * a server-side handler; incomplete blocks/buttons are dropped.
 */
function sanitizeBlocks(v) {
  const i = v && typeof v === 'object' ? v : {};
  const rawBlocks = Array.isArray(i.blocks) ? i.blocks : [];
  const blocks = [];
  for (const b of rawBlocks.slice(0, MAX_BLOCKS)) {
    if (!b || typeof b !== 'object') continue;
    const id = genId(b.id);
    if (b.type === 'separator') {
      blocks.push({ id, type: 'separator', divider: b.divider === undefined ? true : Boolean(b.divider), large: Boolean(b.large) });
    } else if (b.type === 'image') {
      const u = url(b.url);
      if (!u) continue;
      blocks.push({ id, type: 'image', url: u });
    } else if (b.type === 'buttons') {
      const buttons = (Array.isArray(b.buttons) ? b.buttons : [])
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({ id: genId(x.id), label: str(x.label, 80, '').trim(), url: url(x.url), emoji: str(x.emoji, 64, '').trim() }))
        .filter((x) => x.label && x.url) // a link button needs both a label and a URL
        .slice(0, MAX_BLOCK_BUTTONS);
      if (!buttons.length) continue;
      blocks.push({ id, type: 'buttons', buttons });
    } else {
      const content = str(b.content, 4000, '');
      if (!content.trim()) continue;
      blocks.push({ id, type: 'text', content });
    }
  }
  return { enabled: Boolean(i.enabled), accent: isHex(i.accent) ? i.accent : '', blocks };
}

/** Sanitize one welcome/leave message block. */
function sanitizeMessageBlock(m, def) {
  const b = m || {};
  return {
    enabled: Boolean(b.enabled),
    channelId: isSnowflake(b.channelId) ? b.channelId : '',
    v2: sanitizeBlocks(b.v2),
  };
}

function sanitizeAutoresponses(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list.slice(0, MAX_AUTORESPONSES)) {
    if (!raw || typeof raw !== 'object') continue;
    const trigger = str(raw.trigger, 100, '').trim();
    const v2 = sanitizeBlocks(raw.v2);
    if (!trigger || !v2.blocks.length) continue; // need a trigger and a reply body
    out.push({
      id: genId(raw.id),
      trigger,
      match: MATCH_MODES.includes(raw.match) ? raw.match : 'contains',
      enabled: raw.enabled === undefined ? true : Boolean(raw.enabled),
      v2,
    });
  }
  return out;
}

const MAX_ANNOUNCEMENTS = 20;

/** Sanitize scheduled announcements: a channel + interval + block-builder body. */
function sanitizeAnnouncements(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list.slice(0, MAX_ANNOUNCEMENTS)) {
    if (!raw || typeof raw !== 'object') continue;
    const channelId = snowflake(raw.channelId);
    const v2 = sanitizeBlocks(raw.v2);
    if (!channelId || !v2.blocks.length) continue; // needs a target + a body
    out.push({
      id: genId(raw.id),
      enabled: raw.enabled === undefined ? true : Boolean(raw.enabled),
      channelId,
      everyMinutes: int(raw.everyMinutes, 5, 43200, 360), // 5 min … 30 days (default 6h)
      v2,
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
  const v2 = sanitizeBlocks(e.v2);
  const hasV2 = v2.enabled || v2.blocks.length > 0;
  // Drop the block entirely if there's no content at all.
  if (!title && !description && !footer && !color && !enabled && !hasV2) return null;
  return { enabled, title, description, color, footer, v2 };
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

  // Customer-added scam domains: lowercase host only (strip scheme/path), deduped.
  const scamDomains = Array.isArray(am.scamLinks?.extraDomains)
    ? [
        ...new Set(
          am.scamLinks.extraDomains
            .map((d) => str(d, 100, '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
            .filter(Boolean),
        ),
      ].slice(0, 100)
    : [];

  const as = i.autoSlowmode || {};
  const slowChannels = Array.isArray(as.channelIds)
    ? [...new Set(as.channelIds.filter((c) => /^\d{1,20}$/.test(String(c))).map(String))].slice(0, 50)
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
      scamLinks: { enabled: Boolean(am.scamLinks?.enabled), extraDomains: scamDomains },
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
    banAppeal: {
      enabled: Boolean(i.banAppeal?.enabled),
      channelId: snowflake(i.banAppeal?.channelId),
    },
    modmail: {
      enabled: Boolean(i.modmail?.enabled),
      channelId: snowflake(i.modmail?.channelId),
      pingRoleId: snowflake(i.modmail?.pingRoleId),
    },
    starboard: {
      enabled: Boolean(i.starboard?.enabled),
      channelId: snowflake(i.starboard?.channelId),
      emoji: str(i.starboard?.emoji, 64, '').trim() || '⭐',
      threshold: int(i.starboard?.threshold, 1, 100, def.starboard.threshold),
    },
    autoSlowmode: {
      enabled: Boolean(as.enabled),
      messages: int(as.messages, 2, 500, def.autoSlowmode.messages),
      perSeconds: int(as.perSeconds, 1, 300, def.autoSlowmode.perSeconds),
      slowmodeSeconds: int(as.slowmodeSeconds, 1, 21600, def.autoSlowmode.slowmodeSeconds),
      cooldownSeconds: int(as.cooldownSeconds, 5, 3600, def.autoSlowmode.cooldownSeconds),
      channelIds: slowChannels,
    },
  };
}

/** Sanitize the verification-gate settings section against its defaults. */
function sanitizeVerification(v, def) {
  const i = v && typeof v === 'object' ? v : {};
  return {
    channelId: snowflake(i.channelId),
    roleId: snowflake(i.roleId),
    buttonLabel: str(i.buttonLabel, 80, def.buttonLabel) || def.buttonLabel,
    successMessage: str(i.successMessage, 1000, def.successMessage) || def.successMessage,
    v2: sanitizeBlocks(i.v2),
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

/** Sanitize the FiveM-bot settings section against its defaults. */
function sanitizeFivem(f, def) {
  const i = f && typeof f === 'object' ? f : {};
  const sv = i.server || {};
  const st = i.status || {};
  const wl = i.whitelist || {};
  const rp = i.reports || {};
  const rs = i.restarts || {};

  // Accept "host:port" or "host" — keep it simple, the bot normalises further.
  const host = str(sv.host, 100, '').trim();

  const times = Array.isArray(rs.times)
    ? [...new Set(rs.times.map((t) => str(t, 5, '').trim()).filter((t) => TIME_RE.test(t)))].slice(0, 12)
    : [];
  const warnMinutes = Array.isArray(rs.warnMinutes)
    ? [...new Set(rs.warnMinutes.map((m) => Math.round(Number(m))).filter((m) => Number.isFinite(m) && m >= 1 && m <= 120))]
        .sort((a, b) => b - a)
        .slice(0, 6)
    : def.restarts.warnMinutes;

  return {
    server: {
      host,
      name: str(sv.name, 80, '').trim(),
    },
    status: {
      enabled: Boolean(st.enabled),
      channelId: snowflake(st.channelId),
      refreshSec: int(st.refreshSec, 30, 600, def.status.refreshSec),
    },
    whitelist: {
      enabled: Boolean(wl.enabled),
      roleId: snowflake(wl.roleId),
      logChannelId: snowflake(wl.logChannelId),
      application: {
        enabled: Boolean(wl.application?.enabled),
        panelChannelId: snowflake(wl.application?.panelChannelId),
        reviewChannelId: snowflake(wl.application?.reviewChannelId),
      },
    },
    reports: {
      enabled: Boolean(rp.enabled),
      channelId: snowflake(rp.channelId),
      pingRoleId: snowflake(rp.pingRoleId),
    },
    restarts: {
      enabled: Boolean(rs.enabled),
      channelId: snowflake(rs.channelId),
      times,
      warnMinutes,
    },
    monitor: {
      enabled: Boolean(i.monitor?.enabled),
      channelId: snowflake(i.monitor?.channelId),
      pingRoleId: snowflake(i.monitor?.pingRoleId),
      downChecks: int(i.monitor?.downChecks, 1, 10, def.monitor.downChecks),
    },
    playtime: { enabled: Boolean(i.playtime?.enabled) },
    chatBridge: {
      enabled: Boolean(i.chatBridge?.enabled),
      channelId: snowflake(i.chatBridge?.channelId),
    },
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
    announcements: sanitizeAnnouncements(msg.announcements),
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
  out.leveling = sanitizeLeveling(i.leveling, d.leveling);
  out.fivem = sanitizeFivem(i.fivem, d.fivem);

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
