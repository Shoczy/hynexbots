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
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'fivem.db'));
db.exec('PRAGMA journal_mode = WAL;');

// Whitelist: a Discord member, optionally tied to one or more in-game
// identifiers (steam:, license:, discord:, fivem:, etc.). The role grant lives
// on Discord; this table powers /whitelist list and the in-game check endpoint.
db.exec(`
  CREATE TABLE IF NOT EXISTS whitelist (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    identifier TEXT NOT NULL DEFAULT '',  -- normalised in-game id, '' when role-only
    added_by   TEXT NOT NULL,
    added_at   INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_wl_ident ON whitelist(guild_id, identifier);
`);

const norm = (s) => String(s || '').trim().toLowerCase();

/** Add or update a whitelist entry for a member. */
function addWhitelist(guildId, userId, identifier, addedBy) {
  db.prepare(
    `INSERT INTO whitelist (guild_id, user_id, identifier, added_by, added_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET
       identifier = CASE WHEN excluded.identifier <> '' THEN excluded.identifier ELSE whitelist.identifier END,
       added_by = excluded.added_by, added_at = excluded.added_at`,
  ).run(String(guildId), String(userId), norm(identifier), String(addedBy), Date.now());
}

function removeWhitelist(guildId, userId) {
  const info = db.prepare('DELETE FROM whitelist WHERE guild_id = ? AND user_id = ?').run(String(guildId), String(userId));
  return info.changes > 0;
}

function listWhitelist(guildId, limit = 100) {
  return db
    .prepare('SELECT user_id, identifier, added_by, added_at FROM whitelist WHERE guild_id = ? ORDER BY added_at DESC LIMIT ?')
    .all(String(guildId), Math.min(Math.max(1, limit | 0), 500))
    .map((r) => ({ userId: r.user_id, identifier: r.identifier, addedBy: r.added_by, addedAt: r.added_at }));
}

function countWhitelist(guildId) {
  return db.prepare('SELECT COUNT(*) AS n FROM whitelist WHERE guild_id = ?').get(String(guildId)).n;
}

/** Is this in-game identifier whitelisted in any guild this bot serves? */
function isIdentifierWhitelisted(identifier) {
  const id = norm(identifier);
  if (!id) return false;
  return Boolean(db.prepare('SELECT 1 FROM whitelist WHERE identifier = ? LIMIT 1').get(id));
}

module.exports = { addWhitelist, removeWhitelist, listWhitelist, countWhitelist, isIdentifierWhitelisted };
