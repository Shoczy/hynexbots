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

const db = new DatabaseSync(path.join(DATA_DIR, 'tickets.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    channel_id TEXT PRIMARY KEY,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    topic      TEXT NOT NULL DEFAULT '',
    claimed_by TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_guild_user ON tickets (guild_id, user_id);
`);

function createTicket(channelId, guildId, userId, topic = '') {
  db.prepare('INSERT INTO tickets (channel_id, guild_id, user_id, topic, created_at) VALUES (?, ?, ?, ?, ?)').run(
    String(channelId),
    String(guildId),
    String(userId),
    String(topic).slice(0, 100),
    Date.now(),
  );
}

function getTicket(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(String(channelId));
}

function openCount(guildId, userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM tickets WHERE guild_id = ? AND user_id = ?').get(String(guildId), String(userId)).n;
}

function claimTicket(channelId, staffId) {
  db.prepare('UPDATE tickets SET claimed_by = ? WHERE channel_id = ?').run(String(staffId), String(channelId));
}

function deleteTicket(channelId) {
  db.prepare('DELETE FROM tickets WHERE channel_id = ?').run(String(channelId));
}

module.exports = { db, createTicket, getTicket, openCount, claimTicket, deleteTicket };
