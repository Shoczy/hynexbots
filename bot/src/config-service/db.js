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
const secrets = require('./secrets');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
// HYNEX_DB_PATH lets tests (and alternate deployments) point at a different DB.
const DB_PATH = process.env.HYNEX_DB_PATH || path.join(DATA_DIR, 'hynex.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
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

// Accountability trail: who changed what, per bot. Especially relevant now that
// invited team members (not just the owner) can edit config and control the bot.
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id   TEXT NOT NULL,
    actor_id TEXT NOT NULL,            -- Discord user id who performed the action
    action   TEXT NOT NULL,            -- e.g. config.save | member.add | process.stop
    detail   TEXT,                     -- short human-readable context
    at       INTEGER NOT NULL,
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_audit_app ON audit_log(app_id, at);
`);

// Per-command usage counters, bucketed by UTC day. Sold bots batch-report these
// so customers see what their bot actually gets used for, in the dashboard.
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_usage (
    app_id  TEXT NOT NULL,
    command TEXT NOT NULL,
    day     TEXT NOT NULL,           -- YYYY-MM-DD (UTC)
    count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (app_id, command, day),
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );
`);

// Uptime tracking: each time a sold bot phones home (fetches config, reports
// usage or syncs its guild) we mark the current 5-minute slot present. Uptime is
// then "share of slots seen" over a window — a real heartbeat history without the
// bot needing to do anything extra.
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_health (
    app_id TEXT NOT NULL,
    slot   INTEGER NOT NULL,        -- floor(epochMs / SLOT_MS)
    at     INTEGER NOT NULL,        -- last contact within this slot
    PRIMARY KEY (app_id, slot),
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_health_app ON bot_health(app_id, at);
`);

// Per-bot outage log: each time a registered bot stops phoning home (and later
// returns) the health monitor opens/closes an incident here, giving customers a
// downtime history for their own bot — the per-bot analogue of fleet incidents.
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_incidents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id      TEXT NOT NULL,
    started_at  INTEGER NOT NULL,
    resolved_at INTEGER,                   -- null while ongoing
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_bot_incidents ON bot_incidents(app_id, started_at);
`);

// Dashboard → bot command queue. Lets a customer trigger an action from the
// dashboard (e.g. "post the verify panel") without going back to Discord to run
// a slash command. The dashboard enqueues; the running bot polls + executes.
db.exec(`
  CREATE TABLE IF NOT EXISTS bot_commands (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id       TEXT NOT NULL,
    action       TEXT NOT NULL,
    payload      TEXT,                          -- JSON args, or null
    status       TEXT NOT NULL DEFAULT 'pending', -- pending | delivered
    created_at   INTEGER NOT NULL,
    delivered_at INTEGER,
    FOREIGN KEY (app_id) REFERENCES bots(app_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_cmd_app ON bot_commands(app_id, status);
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
    // Every toggleable module MUST be listed here — mergeSettings only keeps
    // module keys present in this default, so a missing key would be silently
    // dropped on save (and the dashboard toggle would appear to "turn back off").
    modules: {
      moderation: true,
      verification: false,
      reactionroles: false,
      antinuke: false,
      welcome: false,
      leveling: false,
      fivem: true,
    },
    messages: {
      welcome: messageBlock(),
      leave: messageBlock(),
      autoresponses: [], // [{ id, trigger, match, reply, enabled }]
      autoRoleIds: [], // roles auto-assigned to members on join
    },
    // Per-command permissions: { [command]: { enabled, roles[] } }.
    commands: {},
    // Per-product tailored settings (only the matching bot's section is shown).
    moderation: moderationDefaults(),
    verification: verificationDefaults(),
    reactionRoles: reactionRolesDefaults(),
    antiNuke: antiNukeDefaults(),
    leveling: levelingDefaults(),
    fivem: fivemDefaults(),
  };
}

/**
 * Tailored config for the FiveM bot. Four optional systems, each with its own
 * enable flag so customers turn on only what they run:
 *   - status:    live "server status" embed (player count, hostname) refreshed on a timer
 *   - whitelist: grant/revoke a Discord role + track in-game identifiers
 *   - reports:   in-game /report calls forwarded to a Discord channel (HTTP intake)
 *   - restarts:  scheduled restart announcements with countdown warnings
 */
function fivemDefaults() {
  return {
    server: {
      host: '', // FiveM server address, e.g. 1.2.3.4:30120 or play.example.com
      name: '', // optional display name override (falls back to the server's hostname)
    },
    status: {
      enabled: false,
      channelId: '', // channel the live status embed is posted/updated in
      refreshSec: 60, // how often the embed refreshes (30–600)
    },
    whitelist: {
      enabled: false,
      roleId: '', // Discord role granted to whitelisted members
      logChannelId: '', // optional: where add/remove actions are logged
    },
    reports: {
      enabled: false,
      channelId: '', // channel in-game reports are posted to
      pingRoleId: '', // optional role pinged on a new report
    },
    restarts: {
      enabled: false,
      channelId: '', // channel restart announcements are posted to
      times: [], // ['04:00','16:00'] — 24h server-local restart times
      warnMinutes: [15, 5, 1], // countdown warnings before each restart
    },
  };
}

/**
 * An optional Components V2 message: an ordered list of blocks (text /
 * separator / image / link-buttons) the customer designs in the dashboard's
 * block builder. When `enabled`, the bot renders this instead of its built-in
 * output. MUST be present in every default that holds one, or mergeSettings
 * drops it on save/load (it only keeps keys listed in the default).
 */
function v2Default() {
  return { enabled: false, accent: '', blocks: [] };
}

/** Tailored config for the verification gate: a button members click to gain access. */
function verificationDefaults() {
  return {
    channelId: '', // where the verification panel is posted
    roleId: '', // role granted when a member verifies
    buttonLabel: 'Verify',
    successMessage: 'You’re verified — welcome aboard! 🎉',
    // Panel content (block builder). Seeded with sensible defaults; the Verify
    // button is appended by the bot.
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
        voiceJoinLeave: false,
      },
    },
    roles: {
      muteRoleId: '',
      modRoleIds: [],
    },
    dmOnPunish: false, // DM the member the reason when they're warned/muted/kicked/banned
  };
}

/** Self-assign role panels: members click buttons to toggle the configured roles. */
function reactionRolesDefaults() {
  return {
    // [{ id, channelId, title, description, roles: [{ id, roleId, label, emoji }] }]
    panels: [],
  };
}

/** Anti-nuke: throttle mass destructive actions by rogue/compromised admins. */
function antiNukeDefaults() {
  return {
    punishment: 'strip', // strip | ban | kick — applied to an offender over a limit
    limits: {
      channelDelete: { enabled: true, max: 3, perSeconds: 30 },
      roleDelete: { enabled: true, max: 3, perSeconds: 30 },
      ban: { enabled: true, max: 5, perSeconds: 30 },
      kick: { enabled: true, max: 5, perSeconds: 30 },
    },
    whitelistUserIds: [], // trusted users exempt from limits
    whitelistRoleIds: [], // holders of these roles are exempt
    alertChannelId: '', // where anti-nuke alerts are posted (falls back to the mod log)
  };
}

/** Tailored config for leveling bots: XP gain, level-up announce, role rewards. */
function levelingDefaults() {
  return {
    xpPerMessage: { min: 15, max: 25 },
    cooldownSec: 60, // min seconds between XP-earning messages
    levelUp: {
      enabled: true,
      channelId: '', // empty = announce in the channel they leveled up in
      message: 'GG {user}, you reached level {level}! 🎉',
    },
    stackRewards: true, // keep lower reward roles when a higher one is earned
    rewards: [], // [{ id, level, roleId }] — role granted at a level
    noXpRoleIds: [], // members with these roles earn no XP
  };
}

/** A welcome/leave message: plain text and/or an embed, posted to a channel. */
function messageBlock() {
  return {
    enabled: false,
    channelId: '',
    v2: v2Default(), // the message body, designed in the dashboard block builder
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

/** Convert a legacy text+embed message block into block-builder blocks. */
function legacyMessageBlocks(b) {
  const blocks = [];
  const push = (c) => c && String(c).trim() && blocks.push({ id: crypto.randomUUID(), type: 'text', content: String(c) });
  if (b && b.text) push(b.text);
  const e = b && b.embed;
  if (e && e.enabled) {
    if (e.title) push(`## ${e.title}`);
    if (e.description) push(e.description);
    if (e.image) blocks.push({ id: crypto.randomUUID(), type: 'image', url: String(e.image) });
    if (e.footer) push(`-# ${e.footer}`);
  }
  return blocks;
}

/**
 * One-way migration of the old single-embed shape into the block-builder model,
 * applied at load time (before merge) so configs saved with the legacy editor
 * keep rendering after the legacy fields were dropped from the schema. Only fills
 * `v2.blocks` when empty — never overwrites blocks the customer already designed.
 */
function migrateLegacy(stored) {
  if (!stored || typeof stored !== 'object') return stored;
  const out = { ...stored };
  const seed = (obj, blocks) => {
    const v2 = obj.v2 && typeof obj.v2 === 'object' ? obj.v2 : {};
    if (Array.isArray(v2.blocks) && v2.blocks.length) return obj; // already has blocks
    if (!blocks.length) return obj;
    return { ...obj, v2: { enabled: Boolean(v2.enabled), accent: v2.accent || '', blocks } };
  };

  if (stored.messages && typeof stored.messages === 'object') {
    const m = stored.messages;
    out.messages = { ...m };
    if (m.welcome && typeof m.welcome === 'object') out.messages.welcome = seed(m.welcome, legacyMessageBlocks(m.welcome));
    if (m.leave && typeof m.leave === 'object') out.messages.leave = seed(m.leave, legacyMessageBlocks(m.leave));
  }
  if (stored.verification && typeof stored.verification === 'object') {
    const v = stored.verification;
    const blocks = [];
    if (v.title) blocks.push({ id: crypto.randomUUID(), type: 'text', content: `## ${v.title}` });
    if (v.description) blocks.push({ id: crypto.randomUUID(), type: 'text', content: String(v.description) });
    out.verification = seed(v, blocks);
  }
  return out;
}

function mergeSettings(stored) {
  const base = defaultSettings();
  const migrated = migrateLegacy(stored);
  if (!migrated || typeof migrated !== 'object') return base;
  const out = {};
  for (const k of Object.keys(base)) out[k] = mergeValue(base[k], migrated[k]);
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

/** Issue a fresh backup/transfer key, invalidating the old one. Returns the new key. */
function regenerateKey(appId) {
  if (!getBot(appId)) return null;
  let key = generateKey();
  while (db.prepare('SELECT 1 FROM bots WHERE license_key = ?').get(key)) key = generateKey();
  db.prepare('UPDATE bots SET license_key = ? WHERE app_id = ?').run(key, String(appId));
  return key;
}

/**
 * Hand ownership of a bot to another Discord account. The new owner is removed
 * from the team list (they're the owner now, not a member). Returns the updated
 * bot, or null if it doesn't exist.
 */
function transferOwner(appId, newOwnerId) {
  if (!getBot(appId)) return null;
  db.prepare('UPDATE bots SET owner_id = ?, claimed_at = ? WHERE app_id = ?').run(
    String(newOwnerId),
    Date.now(),
    String(appId),
  );
  removeMember(appId, newOwnerId);
  return getBot(appId);
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
// Tokens are encrypted at rest (secrets.js) and transparently decrypted on read.
function decryptRow(row) {
  if (row && row.token) row.token = secrets.decrypt(row.token);
  return row;
}

function setProcess({ appId, type, token, guildId = null, autostart = true }) {
  db.prepare(
    `INSERT INTO bot_process (app_id, type, token, guild_id, autostart, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(app_id) DO UPDATE SET
       type = excluded.type, token = excluded.token, guild_id = excluded.guild_id,
       autostart = excluded.autostart, updated_at = excluded.updated_at`,
  ).run(
    String(appId),
    String(type),
    secrets.encrypt(String(token)),
    guildId ? String(guildId) : null,
    autostart ? 1 : 0,
    Date.now(),
  );
}

function getProcess(appId) {
  return decryptRow(db.prepare('SELECT * FROM bot_process WHERE app_id = ?').get(String(appId)));
}

function listAutostart() {
  return db.prepare('SELECT * FROM bot_process WHERE autostart = 1').all().map(decryptRow);
}

/** One-time migration: encrypt any tokens still stored as plaintext. */
function migrateProcessTokens() {
  const rows = db.prepare('SELECT app_id, token FROM bot_process').all();
  const update = db.prepare('UPDATE bot_process SET token = ? WHERE app_id = ?');
  for (const row of rows) {
    if (row.token && !secrets.isEncrypted(row.token)) {
      update.run(secrets.encrypt(row.token), row.app_id);
    }
  }
}
migrateProcessTokens();

function setAutostart(appId, on) {
  db.prepare('UPDATE bot_process SET autostart = ? WHERE app_id = ?').run(on ? 1 : 0, String(appId));
}

function deleteProcess(appId) {
  db.prepare('DELETE FROM bot_process WHERE app_id = ?').run(String(appId));
}

// ── Dashboard → bot command queue ─────────────────────
/** Enqueue a command for a bot to pick up on its next poll. */
function enqueueCommand(appId, action, payload = null) {
  db.prepare('INSERT INTO bot_commands (app_id, action, payload, status, created_at) VALUES (?, ?, ?, ?, ?)').run(
    String(appId),
    String(action),
    payload ? JSON.stringify(payload) : null,
    'pending',
    Date.now(),
  );
}

/**
 * Return this bot's pending commands and mark them delivered (at-least-once →
 * we mark on read so a command isn't executed twice). Also prunes commands
 * delivered more than a day ago so the table stays small.
 */
function takePendingCommands(appId, limit = 10) {
  const rows = db
    .prepare("SELECT id, action, payload FROM bot_commands WHERE app_id = ? AND status = 'pending' ORDER BY id ASC LIMIT ?")
    .all(String(appId), Math.min(Math.max(1, limit | 0), 50));
  if (rows.length) {
    const ph = rows.map(() => '?').join(',');
    db.prepare(`UPDATE bot_commands SET status = 'delivered', delivered_at = ? WHERE id IN (${ph})`).run(
      Date.now(),
      ...rows.map((r) => r.id),
    );
  }
  db.prepare("DELETE FROM bot_commands WHERE status = 'delivered' AND delivered_at < ?").run(Date.now() - 864e5);
  return rows.map((r) => ({ id: r.id, action: r.action, payload: r.payload ? safeParse(r.payload) : null }));
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ── Audit log ─────────────────────────────────────────
function addAudit({ appId, actorId, action, detail = '' }) {
  db.prepare('INSERT INTO audit_log (app_id, actor_id, action, detail, at) VALUES (?, ?, ?, ?, ?)').run(
    String(appId),
    String(actorId),
    String(action),
    String(detail || ''),
    Date.now(),
  );
}

function listAudit(appId, limit = 100) {
  return db
    .prepare('SELECT actor_id, action, detail, at FROM audit_log WHERE app_id = ? ORDER BY at DESC LIMIT ?')
    .all(String(appId), Math.min(Math.max(1, limit | 0), 500))
    .map((r) => ({ actorId: r.actor_id, action: r.action, detail: r.detail, at: r.at }));
}

// ── Command usage analytics ──────────────────────────
function recordUsage(appId, command, n = 1) {
  const day = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO bot_usage (app_id, command, day, count) VALUES (?, ?, ?, ?)
     ON CONFLICT(app_id, command, day) DO UPDATE SET count = count + excluded.count`,
  ).run(String(appId), String(command).slice(0, 64), day, Math.max(1, n | 0));
}

/** Aggregate usage over the last `days` days: totals, per-command, per-day. */
function usageSummary(appId, days = 14) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const rows = db
    .prepare('SELECT command, day, count FROM bot_usage WHERE app_id = ? AND day >= ?')
    .all(String(appId), since);
  let total = 0;
  let totalToday = 0;
  const perCommand = {};
  const byDay = {};
  for (const r of rows) {
    total += r.count;
    if (r.day === today) totalToday += r.count;
    perCommand[r.command] = (perCommand[r.command] || 0) + r.count;
    byDay[r.day] = (byDay[r.day] || 0) + r.count;
  }
  return {
    days,
    total,
    totalToday,
    perCommand: Object.entries(perCommand)
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count),
    byDay: Object.entries(byDay)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => (a.day < b.day ? -1 : 1)),
  };
}

// ── Uptime / health ──────────────────────────────────
const SLOT_MS = 5 * 60 * 1000; // 5-minute presence buckets

/** Mark the bot as alive right now (idempotent within a 5-minute slot). */
function recordHeartbeat(appId) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO bot_health (app_id, slot, at) VALUES (?, ?, ?)
     ON CONFLICT(app_id, slot) DO UPDATE SET at = excluded.at`,
  ).run(String(appId), Math.floor(now / SLOT_MS), now);
}

/** Count the 5-minute slots that fall inside [lo, hi]. */
function slotsBetween(lo, hi) {
  return hi <= lo ? 0 : Math.ceil((hi - lo) / SLOT_MS);
}

/**
 * Uptime summary over the last `days`: overall percentage, last-seen time and a
 * per-day series for charting. Uptime is measured from first-seen (so a brand
 * new bot isn't unfairly penalised for slots before it existed).
 */
function healthSummary(appId, days = 14) {
  const now = Date.now();
  const windowStart = now - days * 864e5;
  const rows = db
    .prepare('SELECT slot, at FROM bot_health WHERE app_id = ? AND at >= ? ORDER BY at ASC')
    .all(String(appId), windowStart);
  if (rows.length === 0) return { days, uptimePct: null, lastSeen: null, byDay: [] };

  const firstAt = rows[0].at;
  const lastSeen = rows[rows.length - 1].at;
  const start = Math.max(windowStart, firstAt);
  const startSlot = Math.floor(start / SLOT_MS);
  const present = rows.filter((r) => r.slot >= startSlot).length;
  const expected = Math.max(1, slotsBetween(start, now));
  const uptimePct = Math.min(100, Math.round((present / expected) * 1000) / 10);

  // Distinct present slots per UTC day (rows are already one-per-slot).
  const perDay = {};
  for (const r of rows) {
    const day = new Date(r.at).toISOString().slice(0, 10);
    perDay[day] = (perDay[day] || 0) + 1;
  }
  const byDay = [];
  const dayStart = Date.parse(new Date(start).toISOString().slice(0, 10) + 'T00:00:00.000Z');
  for (let t = dayStart; t <= now; t += 864e5) {
    const day = new Date(t).toISOString().slice(0, 10);
    const exp = slotsBetween(Math.max(t, start), Math.min(t + 864e5, now));
    const pct = exp > 0 ? Math.min(100, Math.round(((perDay[day] || 0) / exp) * 1000) / 10) : null;
    byDay.push({ day, pct });
  }
  return { days, uptimePct, lastSeen, byDay };
}

// ── Per-bot outage incidents (driven by the health monitor) ──
/** Most recent contact time for a bot, or null if it never phoned home. */
function botLastSeen(appId) {
  const row = db.prepare('SELECT MAX(at) AS at FROM bot_health WHERE app_id = ?').get(String(appId));
  return row?.at || null;
}

/** Active bots with their last-seen time — the monitor's work list. */
function listActiveBotsHealth() {
  return db
    .prepare(
      `SELECT b.app_id AS appId,
              (SELECT MAX(at) FROM bot_health h WHERE h.app_id = b.app_id) AS lastSeen
       FROM bots b WHERE b.status = 'active'`,
    )
    .all();
}

/** Open an outage incident (no-op if one is already open for this bot). */
function openBotIncident(appId, at) {
  const open = db.prepare('SELECT 1 FROM bot_incidents WHERE app_id = ? AND resolved_at IS NULL').get(String(appId));
  if (open) return;
  db.prepare('INSERT INTO bot_incidents (app_id, started_at, resolved_at) VALUES (?, ?, NULL)').run(String(appId), at);
}

/** Resolve the open outage incident for a bot, if any. */
function resolveBotIncident(appId, at) {
  db.prepare('UPDATE bot_incidents SET resolved_at = ? WHERE app_id = ? AND resolved_at IS NULL').run(at, String(appId));
}

function listBotIncidents(appId, limit = 20) {
  return db
    .prepare('SELECT started_at, resolved_at FROM bot_incidents WHERE app_id = ? ORDER BY started_at DESC LIMIT ?')
    .all(String(appId), Math.min(Math.max(1, limit | 0), 100))
    .map((r) => ({
      startedAt: r.started_at,
      resolvedAt: r.resolved_at,
      ongoing: r.resolved_at == null,
      durationMs: (r.resolved_at || Date.now()) - r.started_at,
    }));
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
  regenerateKey,
  transferOwner,
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
  enqueueCommand,
  takePendingCommands,
  addAudit,
  listAudit,
  recordUsage,
  usageSummary,
  recordHeartbeat,
  healthSummary,
  botLastSeen,
  listActiveBotsHealth,
  openBotIncident,
  resolveBotIncident,
  listBotIncidents,
};
