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

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'mod.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS warnings (
    id         TEXT PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    mod_id     TEXT NOT NULL,
    reason     TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_warn_guild_user ON warnings (guild_id, user_id);

  -- Mod-cases: a unified log of every moderation action, numbered per guild.
  CREATE TABLE IF NOT EXISTS modcases (
    guild_id   TEXT NOT NULL,
    case_no    INTEGER NOT NULL,
    user_id    TEXT NOT NULL,
    mod_id     TEXT NOT NULL,
    action     TEXT NOT NULL,
    reason     TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, case_no)
  );
  CREATE INDEX IF NOT EXISTS idx_modcase_user ON modcases (guild_id, user_id);

  -- Modmail: one open staff thread per member who DMs the bot.
  CREATE TABLE IF NOT EXISTS modmail (
    user_id    TEXT PRIMARY KEY,
    thread_id  TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_modmail_thread ON modmail (thread_id);

  -- Temp-roles: a role to remove from a member at expires_at.
  CREATE TABLE IF NOT EXISTS temproles (
    id         TEXT PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    role_id    TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_temprole_exp ON temproles (expires_at);

  -- Temp-bans: a member to unban from a guild at expires_at.
  CREATE TABLE IF NOT EXISTS tempbans (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_tempban_exp ON tempbans (expires_at);

  -- Starboard: maps an original message to its posted star entry.
  CREATE TABLE IF NOT EXISTS starboard (
    message_id      TEXT PRIMARY KEY,
    star_message_id TEXT NOT NULL,
    count           INTEGER NOT NULL DEFAULT 0
  );

  -- Giveaways: one row per giveaway (keyed by its Discord message id) + entries.
  CREATE TABLE IF NOT EXISTS giveaways (
    message_id TEXT PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    prize      TEXT NOT NULL,
    winners    INTEGER NOT NULL DEFAULT 1,
    host_id    TEXT NOT NULL,
    ends_at    INTEGER NOT NULL,
    ended      INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_giveaway_due ON giveaways (ended, ends_at);
  CREATE TABLE IF NOT EXISTS giveaway_entries (
    message_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    PRIMARY KEY (message_id, user_id)
  );

  -- Suggestions: a board where members post ideas and vote 👍/👎; staff resolve.
  CREATE TABLE IF NOT EXISTS suggestions (
    message_id TEXT PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    author_id  TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS suggestion_votes (
    message_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    vote       INTEGER NOT NULL,
    PRIMARY KEY (message_id, user_id)
  );

  -- Leveling: total XP per member (level is derived from XP).
  CREATE TABLE IF NOT EXISTS levels (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    xp       INTEGER NOT NULL DEFAULT 0,
    last_msg INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_levels_guild_xp ON levels (guild_id, xp DESC);
`);

const getXp = (guildId, userId) =>
  db.prepare('SELECT xp, last_msg FROM levels WHERE guild_id = ? AND user_id = ?').get(String(guildId), String(userId)) || { xp: 0, last_msg: 0 };

/** Add XP (and stamp last_msg for the cooldown). Returns the new total. */
function addXp(guildId, userId, amount, now) {
  db.prepare(
    `INSERT INTO levels (guild_id, user_id, xp, last_msg) VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = levels.xp + excluded.xp, last_msg = excluded.last_msg`,
  ).run(String(guildId), String(userId), Math.max(0, amount | 0), now);
  return getXp(guildId, userId).xp;
}

/** Add XP without touching the message cooldown (used by voice rewards). Returns the new total. */
function addVoiceXp(guildId, userId, amount) {
  db.prepare(
    `INSERT INTO levels (guild_id, user_id, xp, last_msg) VALUES (?, ?, ?, 0)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = levels.xp + excluded.xp`,
  ).run(String(guildId), String(userId), Math.max(0, amount | 0));
  return getXp(guildId, userId).xp;
}

function setXp(guildId, userId, xp) {
  db.prepare(
    `INSERT INTO levels (guild_id, user_id, xp, last_msg) VALUES (?, ?, ?, 0)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = excluded.xp`,
  ).run(String(guildId), String(userId), Math.max(0, xp | 0));
}

const topLevels = (guildId, limit = 10) =>
  db.prepare('SELECT user_id, xp FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(String(guildId), Math.min(Math.max(1, limit | 0), 25));

const rankOf = (guildId, userId) => {
  const { xp } = getXp(guildId, userId);
  return Number(db.prepare('SELECT COUNT(*) AS n FROM levels WHERE guild_id = ? AND xp > ?').get(String(guildId), xp).n || 0) + 1;
};

// ── Giveaways ─────────────────────────────────────────
function createGiveaway({ messageId, guildId, channelId, prize, winners, hostId, endsAt }) {
  db.prepare(
    `INSERT INTO giveaways (message_id, guild_id, channel_id, prize, winners, host_id, ends_at, ended)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
  ).run(String(messageId), String(guildId), String(channelId), String(prize), Math.max(1, winners | 0), String(hostId), endsAt);
}
const getGiveaway = (messageId) => db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(String(messageId)) || null;
const dueGiveaways = (now = Date.now()) => db.prepare('SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?').all(now);
const markGiveawayEnded = (messageId) => db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?').run(String(messageId));

/** Toggle a member's entry. Returns { entered, count }. */
function toggleGiveawayEntry(messageId, userId) {
  const existing = db.prepare('SELECT 1 FROM giveaway_entries WHERE message_id = ? AND user_id = ?').get(String(messageId), String(userId));
  if (existing) {
    db.prepare('DELETE FROM giveaway_entries WHERE message_id = ? AND user_id = ?').run(String(messageId), String(userId));
  } else {
    db.prepare('INSERT INTO giveaway_entries (message_id, user_id) VALUES (?, ?)').run(String(messageId), String(userId));
  }
  return { entered: !existing, count: giveawayEntryCount(messageId) };
}
const giveawayEntryCount = (messageId) =>
  Number(db.prepare('SELECT COUNT(*) AS n FROM giveaway_entries WHERE message_id = ?').get(String(messageId)).n || 0);
const giveawayEntrants = (messageId) =>
  db.prepare('SELECT user_id FROM giveaway_entries WHERE message_id = ?').all(String(messageId)).map((r) => r.user_id);

/** Prune giveaways (and their entries) ended more than `maxAgeMs` ago. */
function pruneGiveaways(maxAgeMs = 7 * 86_400_000, now = Date.now()) {
  const old = db.prepare('SELECT message_id FROM giveaways WHERE ended = 1 AND ends_at < ?').all(now - maxAgeMs);
  for (const { message_id } of old) {
    db.prepare('DELETE FROM giveaway_entries WHERE message_id = ?').run(message_id);
    db.prepare('DELETE FROM giveaways WHERE message_id = ?').run(message_id);
  }
}

// ── Suggestions ───────────────────────────────────────
function createSuggestion({ messageId, guildId, channelId, authorId }) {
  db.prepare(
    `INSERT INTO suggestions (message_id, guild_id, channel_id, author_id, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`,
  ).run(String(messageId), String(guildId), String(channelId), String(authorId), Date.now());
}
const getSuggestion = (messageId) => db.prepare('SELECT * FROM suggestions WHERE message_id = ?').get(String(messageId)) || null;
const setSuggestionStatus = (messageId, status) => db.prepare('UPDATE suggestions SET status = ? WHERE message_id = ?').run(String(status), String(messageId));
const suggestionTally = (messageId) => ({
  up: Number(db.prepare('SELECT COUNT(*) AS n FROM suggestion_votes WHERE message_id = ? AND vote = 1').get(String(messageId)).n || 0),
  down: Number(db.prepare('SELECT COUNT(*) AS n FROM suggestion_votes WHERE message_id = ? AND vote = -1').get(String(messageId)).n || 0),
});

/** Cast/switch/clear a vote (`1` or `-1`). Clicking the same vote again clears it. Returns the tally. */
function voteSuggestion(messageId, userId, vote) {
  const cur = db.prepare('SELECT vote FROM suggestion_votes WHERE message_id = ? AND user_id = ?').get(String(messageId), String(userId));
  if (cur && cur.vote === vote) {
    db.prepare('DELETE FROM suggestion_votes WHERE message_id = ? AND user_id = ?').run(String(messageId), String(userId));
  } else {
    db.prepare(
      `INSERT INTO suggestion_votes (message_id, user_id, vote) VALUES (?, ?, ?)
       ON CONFLICT(message_id, user_id) DO UPDATE SET vote = excluded.vote`,
    ).run(String(messageId), String(userId), vote);
  }
  return suggestionTally(messageId);
}

const getStar = (messageId) => db.prepare('SELECT star_message_id, count FROM starboard WHERE message_id = ?').get(String(messageId)) || null;
const setStar = (messageId, starMessageId, count) =>
  db.prepare(
    `INSERT INTO starboard (message_id, star_message_id, count) VALUES (?, ?, ?)
     ON CONFLICT(message_id) DO UPDATE SET star_message_id = excluded.star_message_id, count = excluded.count`,
  ).run(String(messageId), String(starMessageId), count | 0);
const deleteStar = (messageId) => db.prepare('DELETE FROM starboard WHERE message_id = ?').run(String(messageId));

/** Schedule a role to be removed at `expiresAt` (replaces any existing one for the same user+role). */
function addTempRole(guildId, userId, roleId, expiresAt) {
  db.prepare('DELETE FROM temproles WHERE guild_id = ? AND user_id = ? AND role_id = ?').run(String(guildId), String(userId), String(roleId));
  db.prepare('INSERT INTO temproles (id, guild_id, user_id, role_id, expires_at) VALUES (?, ?, ?, ?, ?)').run(
    crypto.randomUUID(),
    String(guildId),
    String(userId),
    String(roleId),
    expiresAt,
  );
}
const dueTempRoles = (now = Date.now()) => db.prepare('SELECT * FROM temproles WHERE expires_at <= ?').all(now);
const removeTempRoleRow = (id) => db.prepare('DELETE FROM temproles WHERE id = ?').run(String(id));
const removeTempRole = (guildId, userId, roleId) =>
  Number(db.prepare('DELETE FROM temproles WHERE guild_id = ? AND user_id = ? AND role_id = ?').run(String(guildId), String(userId), String(roleId)).changes || 0);
const listTempRoles = (guildId, userId) =>
  db.prepare('SELECT * FROM temproles WHERE guild_id = ? AND user_id = ? ORDER BY expires_at ASC').all(String(guildId), String(userId));

/** Schedule a member to be unbanned at `expiresAt` (replaces any existing one). */
function addTempBan(guildId, userId, expiresAt) {
  db.prepare(
    `INSERT INTO tempbans (guild_id, user_id, expires_at) VALUES (?, ?, ?)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET expires_at = excluded.expires_at`,
  ).run(String(guildId), String(userId), expiresAt);
}
const dueTempBans = (now = Date.now()) => db.prepare('SELECT * FROM tempbans WHERE expires_at <= ?').all(now);
const removeTempBan = (guildId, userId) =>
  Number(db.prepare('DELETE FROM tempbans WHERE guild_id = ? AND user_id = ?').run(String(guildId), String(userId)).changes || 0);

/** Map a member to their open modmail thread (upsert). */
function setModmailThread(userId, threadId, guildId) {
  db.prepare(
    `INSERT INTO modmail (user_id, thread_id, guild_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET thread_id = excluded.thread_id, guild_id = excluded.guild_id, created_at = excluded.created_at`,
  ).run(String(userId), String(threadId), String(guildId), Date.now());
}
const getModmailThread = (userId) => db.prepare('SELECT thread_id FROM modmail WHERE user_id = ?').get(String(userId))?.thread_id || null;
const getModmailUser = (threadId) => db.prepare('SELECT user_id FROM modmail WHERE thread_id = ?').get(String(threadId))?.user_id || null;
const closeModmail = (userId) => db.prepare('DELETE FROM modmail WHERE user_id = ?').run(String(userId));

/** Record a warning. Returns the new row. */
function addWarning(guildId, userId, modId, reason) {
  const row = {
    id: crypto.randomUUID(),
    guild_id: String(guildId),
    user_id: String(userId),
    mod_id: String(modId),
    reason: String(reason || '').slice(0, 1000),
    created_at: Date.now(),
  };
  db.prepare(
    `INSERT INTO warnings (id, guild_id, user_id, mod_id, reason, created_at)
     VALUES (@id, @guild_id, @user_id, @mod_id, @reason, @created_at)`,
  ).run(row);
  return row;
}

// ── Mod-cases ─────────────────────────────────────────
/** Record a moderation action as a numbered case. Returns the new row. */
function addCase(guildId, userId, modId, action, reason) {
  const next = Number(db.prepare('SELECT COALESCE(MAX(case_no), 0) + 1 AS n FROM modcases WHERE guild_id = ?').get(String(guildId)).n);
  const row = {
    guild_id: String(guildId),
    case_no: next,
    user_id: String(userId),
    mod_id: String(modId || 'system'),
    action: String(action),
    reason: String(reason || '').slice(0, 1000),
    created_at: Date.now(),
  };
  db.prepare(
    `INSERT INTO modcases (guild_id, case_no, user_id, mod_id, action, reason, created_at)
     VALUES (@guild_id, @case_no, @user_id, @mod_id, @action, @reason, @created_at)`,
  ).run(row);
  return row;
}
const getCase = (guildId, caseNo) =>
  db.prepare('SELECT * FROM modcases WHERE guild_id = ? AND case_no = ?').get(String(guildId), caseNo | 0) || null;
const casesForUser = (guildId, userId, limit = 15) =>
  db.prepare('SELECT * FROM modcases WHERE guild_id = ? AND user_id = ? ORDER BY case_no DESC LIMIT ?').all(String(guildId), String(userId), Math.min(Math.max(1, limit | 0), 50));
const recentCases = (guildId, limit = 15) =>
  db.prepare('SELECT * FROM modcases WHERE guild_id = ? ORDER BY case_no DESC LIMIT ?').all(String(guildId), Math.min(Math.max(1, limit | 0), 50));
const deleteCase = (guildId, caseNo) =>
  Number(db.prepare('DELETE FROM modcases WHERE guild_id = ? AND case_no = ?').run(String(guildId), caseNo | 0).changes || 0);

/**
 * Active warnings for a user, newest first. When `expireDays > 0`, warnings
 * older than that window are ignored (they don't count toward escalation).
 */
function activeWarnings(guildId, userId, expireDays = 0) {
  const rows = db
    .prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC')
    .all(String(guildId), String(userId));
  if (!expireDays) return rows;
  const cutoff = Date.now() - expireDays * 86_400_000;
  return rows.filter((r) => r.created_at >= cutoff);
}

/** Remove all warnings for a user in a guild. Returns the number removed. */
function clearWarnings(guildId, userId) {
  const info = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(String(guildId), String(userId));
  return Number(info.changes || 0);
}

module.exports = {
  db,
  addWarning,
  activeWarnings,
  clearWarnings,
  addCase,
  getCase,
  casesForUser,
  recentCases,
  deleteCase,
  setModmailThread,
  getModmailThread,
  getModmailUser,
  closeModmail,
  addTempRole,
  dueTempRoles,
  removeTempRoleRow,
  removeTempRole,
  listTempRoles,
  addTempBan,
  dueTempBans,
  removeTempBan,
  createGiveaway,
  getGiveaway,
  dueGiveaways,
  markGiveawayEnded,
  toggleGiveawayEntry,
  giveawayEntryCount,
  giveawayEntrants,
  pruneGiveaways,
  createSuggestion,
  getSuggestion,
  setSuggestionStatus,
  suggestionTally,
  voteSuggestion,
  getStar,
  setStar,
  deleteStar,
  getXp,
  addXp,
  addVoiceXp,
  setXp,
  topLevels,
  rankOf,
};
