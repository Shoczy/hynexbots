'use strict';

// Silence the harmless "SQLite is experimental" warning from node:sqlite.
const _emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...rest) => {
  const opts = rest[0];
  const isExperimentalSqlite =
    (typeof warning === 'string' && warning.includes('SQLite is an experimental')) ||
    (opts && (opts.type === 'ExperimentalWarning' || opts === 'ExperimentalWarning'));
  if (isExperimentalSqlite) return;
  return _emitWarning(warning, ...rest);
};

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { ALL_PERMISSIONS, sanitizePermissions } = require('./permissions');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'hynex.db'));
db.exec('PRAGMA journal_mode = WAL;');

/**
 * A "bot" is the actual deliverable a customer bought: one Discord application,
 * identified by its Application (client) ID. Config is keyed by that ID, so a
 * running bot can fetch its own settings via client.application.id.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS bots (
    app_id      TEXT PRIMARY KEY,         -- Discord Application ID (the bot's identity)
    name        TEXT NOT NULL,            -- display name shown in the dashboard
    type        TEXT NOT NULL,            -- product type: moderation | tickets | ... | custom
    owner_id    TEXT,                     -- customer Discord user id (pre-assigned, or set on key redeem)
    license_key TEXT UNIQUE,              -- optional backup / transfer token
    status      TEXT NOT NULL DEFAULT 'active', -- active | revoked
    features    TEXT,                     -- optional per-bot capability override (JSON); null = use type template
    created_at  INTEGER NOT NULL,
    claimed_at  INTEGER
  );

  CREATE TABLE IF NOT EXISTS bot_members (
    app_id    TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    role      TEXT NOT NULL DEFAULT 'admin',
    added_at  INTEGER NOT NULL,
    PRIMARY KEY (app_id, user_id),
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bot_config (
    app_id     TEXT PRIMARY KEY,
    settings   TEXT NOT NULL,             -- JSON blob
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bot_guild (
    app_id     TEXT PRIMARY KEY,          -- the bot reports its guild's roles & channels here
    data       TEXT NOT NULL,             -- JSON: { guildId, guildName, roles[], channels[] }
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );
`);

// Lightweight migrations: add columns that post-date the original schema.
// CREATE TABLE IF NOT EXISTS never alters an existing table, so do it by hand.
function ensureColumn(table, column, decl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
}
ensureColumn('bots', 'features', 'TEXT');
// Per-member granular permissions (JSON array of tokens; see permissions.js).
ensureColumn('bot_members', 'permissions', 'TEXT');

// Locally-managed bot processes: when a bot is registered with its token, the
// main host can spawn and supervise the sold-bot process. Stored so they can be
// relaunched automatically when the main bot restarts.
// NOTE: `token` is a Discord bot token kept in the local DB — treat hynex.db as
// a secret (it already holds license keys). Restrict file access accordingly.
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_process (
    app_id     TEXT PRIMARY KEY,
    type       TEXT NOT NULL,
    token      TEXT NOT NULL,
    guild_id   TEXT,                        -- guild where it was registered (for instant command deploy)
    autostart  INTEGER NOT NULL DEFAULT 1,  -- relaunch on main-bot startup
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );
`);

// ── Default settings schema ───────────────────────────
function defaultSettings() {
  return {
    basics: {
      prefix: '!',
      embedColor: '#6366f1',
      nickname: '',
      language: 'en',
      logChannelId: '',
    },
    modules: {
      moderation: true,
      welcome: false,
      economy: false,
      music: false,
      tickets: false,
      leveling: false,
    },
    messages: {
      welcome: messageBlock(),
      leave: messageBlock(),
      autoresponses: [], // [{ id, trigger, match, reply, enabled }]
    },
    // Per-command permissions: { [command]: { enabled, roles[] } }.
    commands: {},
    // Per-product tailored settings (only the matching bot's section is shown).
    moderation: moderationDefaults(),
    tickets: ticketsDefaults(),
    economy: economyDefaults(),
    music: musicDefaults(),
  };
}

/** Tailored config for moderation bots: auto-mod, anti-raid, warnings, logging, roles. */
function moderationDefaults() {
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
    antiRaid: {
      enabled: false,
      minAccountAgeDays: 0, // 0 = no gate
      joinRate: { enabled: false, joins: 10, perSeconds: 10 },
    },
    warnings: {
      expireDays: 0, // 0 = never expire
      escalations: [], // [{ id, threshold, action }] — action: timeout|mute|kick|ban
    },
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
    roles: {
      muteRoleId: '',
      modRoleIds: [],
    },
  };
}

/** Tailored config for ticket/support bots. */
function ticketsDefaults() {
  return {
    staffRoleIds: [],
    categoryId: '', // Discord category channel new tickets are created under
    transcripts: { enabled: false, channelId: '' },
    claiming: false, // staff "claim" system
    maxOpenPerUser: 1,
    openMessage: 'Thanks for reaching out — a staff member will be with you shortly.',
    panel: {
      title: 'Need help?',
      description: 'Click the button below to open a support ticket.',
      buttonLabel: 'Open a ticket',
    },
    categories: [], // [{ id, label, emoji }] — ticket topics
  };
}

/** Tailored config for economy bots. */
function economyDefaults() {
  return {
    currencyName: 'coins',
    currencySymbol: '🪙',
    startingBalance: 100,
    daily: { enabled: true, amount: 250, streakBonus: 50 },
    work: { enabled: true, min: 50, max: 200, cooldownSec: 3600 },
    gambling: false, // coinflip / slots
    leaderboard: true,
    shop: [], // [{ id, name, price, roleId, description }]
  };
}

/** Tailored config for music bots. */
function musicDefaults() {
  return {
    defaultVolume: 50,
    maxQueueLength: 100,
    djRoleIds: [],
    djOnly: false, // restrict playback controls to DJ roles
    autoLeaveSec: 60, // leave when the channel is empty (0 = never)
    allowFilters: true, // audio filters/effects
    announceNowPlaying: true,
  };
}

/** A welcome/leave message: plain text and/or an embed, posted to a channel. */
function messageBlock() {
  return {
    enabled: false,
    channelId: '',
    text: '',
    embed: { enabled: false, title: '', description: '', color: '#6366f1', image: '', footer: '' },
  };
}

/**
 * Type-aware deep merge of stored settings over defaults. If a stored value's
 * type doesn't match the default (e.g. an old config where `messages` was a
 * flat object), the default wins — so the schema can evolve without breaking
 * older saved configs.
 */
function mergeValue(def, val) {
  if (Array.isArray(def)) return Array.isArray(val) ? val : def;
  if (def && typeof def === 'object') {
    if (!val || typeof val !== 'object' || Array.isArray(val)) return def;
    // Open-ended map (default is `{}`, e.g. `commands`): there are no fixed keys
    // to merge, so keep the stored entries as-is instead of dropping them.
    if (Object.keys(def).length === 0) return val;
    const out = {};
    for (const k of Object.keys(def)) out[k] = mergeValue(def[k], val[k]);
    return out;
  }
  return typeof val === typeof def ? val : def;
}

function mergeSettings(stored) {
  const base = defaultSettings();
  if (!stored || typeof stored !== 'object') return base;
  const out = {};
  for (const k of Object.keys(base)) out[k] = mergeValue(base[k], stored[k]);
  return out;
}

// ── Bots ──────────────────────────────────────────────
function generateKey() {
  const block = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `HXN-${block()}-${block()}-${block()}`;
}

const VALID_APP_ID = (v) => /^\d{17,20}$/.test(String(v || ''));

/**
 * Register a delivered bot. `ownerId` may be null for key-only claiming.
 * `features` is an optional per-bot capability override (object or null) — used
 * for bespoke `custom` builds; when null the product type template applies.
 * Returns { ok, error?, bot?, key? }.
 */
function registerBot({ appId, name, type, ownerId = null, withKey = true, features = null }) {
  if (!VALID_APP_ID(appId)) return { ok: false, error: 'invalid_app_id' };
  if (db.prepare('SELECT 1 FROM bots WHERE app_id = ?').get(appId)) {
    return { ok: false, error: 'already_registered' };
  }
  let key = null;
  if (withKey) {
    key = generateKey();
    while (db.prepare('SELECT 1 FROM bots WHERE license_key = ?').get(key)) key = generateKey();
  }
  db.prepare(
    `INSERT INTO bots (app_id, name, type, owner_id, license_key, status, features, created_at, claimed_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
  ).run(
    String(appId),
    String(name),
    String(type),
    ownerId,
    key,
    features ? JSON.stringify(features) : null,
    Date.now(),
    ownerId ? Date.now() : null,
  );
  return { ok: true, bot: getBot(appId), key };
}

function getBot(appId) {
  return db.prepare('SELECT * FROM bots WHERE app_id = ?').get(String(appId));
}

function getBotByKey(key) {
  return db.prepare('SELECT * FROM bots WHERE license_key = ?').get(String(key));
}

/** Claim a bot via its backup key. Returns { ok, error?, bot? }. */
function redeemKey(key, userId) {
  const bot = getBotByKey(String(key).trim().toUpperCase());
  if (!bot) return { ok: false, error: 'invalid_key' };
  if (bot.status === 'revoked') return { ok: false, error: 'revoked' };
  if (bot.owner_id && bot.owner_id !== userId) return { ok: false, error: 'already_claimed' };
  if (!bot.owner_id) {
    db.prepare('UPDATE bots SET owner_id = ?, claimed_at = ? WHERE app_id = ?').run(userId, Date.now(), bot.app_id);
  }
  return { ok: true, bot: getBot(bot.app_id) };
}

/** Bots a user owns or was invited to manage. */
function listBotsForUser(userId) {
  return db
    .prepare(
      `SELECT DISTINCT b.* FROM bots b
       LEFT JOIN bot_members m ON m.app_id = b.app_id
       WHERE b.status = 'active' AND (b.owner_id = ? OR m.user_id = ?)`,
    )
    .all(String(userId), String(userId));
}

function accessibleBot(userId, appId) {
  return db
    .prepare(
      `SELECT DISTINCT b.* FROM bots b
       LEFT JOIN bot_members m ON m.app_id = b.app_id
       WHERE b.status = 'active' AND b.app_id = ? AND (b.owner_id = ? OR m.user_id = ?)`,
    )
    .get(String(appId), String(userId), String(userId));
}

function parsePerms(raw) {
  try {
    const a = JSON.parse(raw || '[]');
    return Array.isArray(a) ? sanitizePermissions(a) : [];
  } catch {
    return [];
  }
}

function addMember(appId, userId, permissions = []) {
  db.prepare(
    'INSERT OR IGNORE INTO bot_members (app_id, user_id, role, permissions, added_at) VALUES (?, ?, ?, ?, ?)',
  ).run(String(appId), String(userId), 'member', JSON.stringify(sanitizePermissions(permissions)), Date.now());
}

function setMemberPermissions(appId, userId, permissions) {
  db.prepare('UPDATE bot_members SET permissions = ? WHERE app_id = ? AND user_id = ?').run(
    JSON.stringify(sanitizePermissions(permissions)),
    String(appId),
    String(userId),
  );
}

function removeMember(appId, userId) {
  db.prepare('DELETE FROM bot_members WHERE app_id = ? AND user_id = ?').run(String(appId), String(userId));
}

function listMembers(appId) {
  return db
    .prepare('SELECT user_id, role, permissions, added_at FROM bot_members WHERE app_id = ?')
    .all(String(appId))
    .map((m) => ({ userId: m.user_id, role: m.role, permissions: parsePerms(m.permissions), addedAt: m.added_at }));
}

/**
 * Resolve a user's access to a bot, with their effective permissions.
 * Returns { bot, isOwner, permissions } or null if they have no access.
 * The owner implicitly holds every permission.
 */
function memberAccess(userId, appId) {
  const bot = db.prepare("SELECT * FROM bots WHERE status = 'active' AND app_id = ?").get(String(appId));
  if (!bot) return null;
  if (bot.owner_id && bot.owner_id === String(userId)) {
    return { bot, isOwner: true, permissions: [...ALL_PERMISSIONS] };
  }
  const m = db
    .prepare('SELECT permissions FROM bot_members WHERE app_id = ? AND user_id = ?')
    .get(String(appId), String(userId));
  if (!m) return null;
  return { bot, isOwner: false, permissions: parsePerms(m.permissions) };
}

// ── Config ────────────────────────────────────────────
function getConfig(appId) {
  const row = db.prepare('SELECT settings FROM bot_config WHERE app_id = ?').get(String(appId));
  return mergeSettings(row ? JSON.parse(row.settings) : null);
}

function setConfig(appId, settings) {
  const merged = mergeSettings(settings);
  db.prepare(
    `INSERT INTO bot_config (app_id, settings, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(app_id) DO UPDATE SET settings = excluded.settings, updated_at = excluded.updated_at`,
  ).run(String(appId), JSON.stringify(merged), Date.now());
  return merged;
}

// ── Synced guild data (roles & channels reported by the running bot) ──
function setGuild(appId, data) {
  db.prepare(
    `INSERT INTO bot_guild (app_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(app_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(String(appId), JSON.stringify(data), Date.now());
}

function getGuild(appId) {
  const row = db.prepare('SELECT data, updated_at FROM bot_guild WHERE app_id = ?').get(String(appId));
  if (!row) return null;
  try {
    return { ...JSON.parse(row.data), syncedAt: row.updated_at };
  } catch {
    return null;
  }
}

// ── Managed processes (auto-launched sold bots) ──────
function setProcess({ appId, type, token, guildId = null, autostart = true }) {
  db.prepare(
    `INSERT INTO bot_process (app_id, type, token, guild_id, autostart, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(app_id) DO UPDATE SET
       type = excluded.type, token = excluded.token, guild_id = excluded.guild_id,
       autostart = excluded.autostart, updated_at = excluded.updated_at`,
  ).run(String(appId), String(type), String(token), guildId ? String(guildId) : null, autostart ? 1 : 0, Date.now());
}

function getProcess(appId) {
  return db.prepare('SELECT * FROM bot_process WHERE app_id = ?').get(String(appId));
}

function listAutostart() {
  return db.prepare('SELECT * FROM bot_process WHERE autostart = 1').all();
}

function setAutostart(appId, on) {
  db.prepare('UPDATE bot_process SET autostart = ? WHERE app_id = ?').run(on ? 1 : 0, String(appId));
}

function deleteProcess(appId) {
  db.prepare('DELETE FROM bot_process WHERE app_id = ?').run(String(appId));
}

module.exports = {
  db,
  defaultSettings,
  mergeSettings,
  setGuild,
  getGuild,
  setProcess,
  getProcess,
  listAutostart,
  setAutostart,
  deleteProcess,
  registerBot,
  getBot,
  getBotByKey,
  redeemKey,
  listBotsForUser,
  accessibleBot,
  memberAccess,
  addMember,
  setMemberPermissions,
  removeMember,
  listMembers,
  getConfig,
  setConfig,
};
