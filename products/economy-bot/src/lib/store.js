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

const db = new DatabaseSync(path.join(DATA_DIR, 'economy.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    balance    INTEGER NOT NULL DEFAULT 0,
    streak     INTEGER NOT NULL DEFAULT 0,
    last_daily INTEGER NOT NULL DEFAULT 0,
    last_work  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );
`);

/** Get an account, creating it with `startingBalance` on first access. */
function getAccount(guildId, userId, startingBalance = 0) {
  const g = String(guildId);
  const u = String(userId);
  let row = db.prepare('SELECT * FROM accounts WHERE guild_id = ? AND user_id = ?').get(g, u);
  if (!row) {
    db.prepare('INSERT INTO accounts (guild_id, user_id, balance) VALUES (?, ?, ?)').run(g, u, Math.max(0, startingBalance));
    row = db.prepare('SELECT * FROM accounts WHERE guild_id = ? AND user_id = ?').get(g, u);
  }
  return row;
}

/** Add (or subtract) from a balance. Never goes below 0. Returns the new balance. */
function addBalance(guildId, userId, delta, startingBalance = 0) {
  const acc = getAccount(guildId, userId, startingBalance);
  const next = Math.max(0, acc.balance + Math.round(delta));
  db.prepare('UPDATE accounts SET balance = ? WHERE guild_id = ? AND user_id = ?').run(next, String(guildId), String(userId));
  return next;
}

function setBalance(guildId, userId, value) {
  db.prepare('UPDATE accounts SET balance = ? WHERE guild_id = ? AND user_id = ?').run(Math.max(0, Math.round(value)), String(guildId), String(userId));
}

function recordDaily(guildId, userId, streak, ts) {
  db.prepare('UPDATE accounts SET streak = ?, last_daily = ? WHERE guild_id = ? AND user_id = ?').run(streak, ts, String(guildId), String(userId));
}

function recordWork(guildId, userId, ts) {
  db.prepare('UPDATE accounts SET last_work = ? WHERE guild_id = ? AND user_id = ?').run(ts, String(guildId), String(userId));
}

/** Top accounts by balance for a guild. */
function top(guildId, limit = 10) {
  return db.prepare('SELECT user_id, balance FROM accounts WHERE guild_id = ? ORDER BY balance DESC LIMIT ?').all(String(guildId), limit);
}

module.exports = { db, getAccount, addBalance, setBalance, recordDaily, recordWork, top };
