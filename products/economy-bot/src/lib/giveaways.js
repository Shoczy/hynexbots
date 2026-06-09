'use strict';

// Giveaway store — shares the economy sqlite db (data/economy.db).
const crypto = require('crypto');
const { db } = require('./store');

db.exec(`
  CREATE TABLE IF NOT EXISTS giveaways (
    id              TEXT PRIMARY KEY,
    message_id      TEXT NOT NULL DEFAULT '',
    guild_id        TEXT NOT NULL,
    channel_id      TEXT NOT NULL,
    prize           TEXT NOT NULL,
    winners         INTEGER NOT NULL DEFAULT 1,
    host_id         TEXT NOT NULL,
    require_role_id TEXT NOT NULL DEFAULT '',
    ends_at         INTEGER NOT NULL,
    ended           INTEGER NOT NULL DEFAULT 0,
    entrants        TEXT NOT NULL DEFAULT '[]'
  );
  CREATE INDEX IF NOT EXISTS idx_gw_guild ON giveaways (guild_id, ended);
`);

function create({ guildId, channelId, prize, winners, hostId, requireRoleId, endsAt }) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO giveaways (id, guild_id, channel_id, prize, winners, host_id, require_role_id, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, String(guildId), String(channelId), String(prize), winners | 0, String(hostId), String(requireRoleId || ''), endsAt);
  return get(id);
}

function get(id) {
  return db.prepare('SELECT * FROM giveaways WHERE id = ?').get(String(id)) || null;
}

function setMessageId(id, messageId) {
  db.prepare('UPDATE giveaways SET message_id = ? WHERE id = ?').run(String(messageId), String(id));
}

function setEntrants(id, arr) {
  db.prepare('UPDATE giveaways SET entrants = ? WHERE id = ?').run(JSON.stringify(arr), String(id));
}

function markEnded(id) {
  db.prepare('UPDATE giveaways SET ended = 1 WHERE id = ?').run(String(id));
}

function active() {
  return db.prepare('SELECT * FROM giveaways WHERE ended = 0').all();
}

function recent(guildId, limit = 10) {
  return db.prepare('SELECT * FROM giveaways WHERE guild_id = ? ORDER BY ends_at DESC LIMIT ?').all(String(guildId), limit);
}

function entrantsOf(gw) {
  try {
    const a = JSON.parse(gw.entrants || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

module.exports = { create, get, setMessageId, setEntrants, markEnded, active, recent, entrantsOf };
