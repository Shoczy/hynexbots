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
`);

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

module.exports = { db, addWarning, activeWarnings, clearWarnings };
