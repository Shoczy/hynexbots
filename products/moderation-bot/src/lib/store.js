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
`);

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
  setModmailThread,
  getModmailThread,
  getModmailUser,
  closeModmail,
  addTempRole,
  dueTempRoles,
  removeTempRoleRow,
  removeTempRole,
  listTempRoles,
};
