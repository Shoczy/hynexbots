'use strict';

// Saved playlists — shares the music sqlite db (data/music.db).
const { db } = require('./store');

db.exec(`
  CREATE TABLE IF NOT EXISTS playlists (
    guild_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    tracks     TEXT NOT NULL,        -- JSON array of { title, url, duration, durationSec }
    created_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, name)
  );
`);

function save(guildId, name, tracks) {
  db.prepare(
    `INSERT INTO playlists (guild_id, name, tracks, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id, name) DO UPDATE SET tracks = excluded.tracks, created_at = excluded.created_at`,
  ).run(String(guildId), name, JSON.stringify(tracks), Date.now());
}

function get(guildId, name) {
  const row = db.prepare('SELECT tracks FROM playlists WHERE guild_id = ? AND name = ?').get(String(guildId), name);
  if (!row) return null;
  try {
    const a = JSON.parse(row.tracks);
    return Array.isArray(a) ? a : null;
  } catch {
    return null;
  }
}

function exists(guildId, name) {
  return Boolean(db.prepare('SELECT 1 FROM playlists WHERE guild_id = ? AND name = ?').get(String(guildId), name));
}

function list(guildId) {
  return db
    .prepare('SELECT name, tracks FROM playlists WHERE guild_id = ? ORDER BY created_at DESC')
    .all(String(guildId))
    .map((r) => {
      let n = 0;
      try {
        n = JSON.parse(r.tracks).length;
      } catch {
        n = 0;
      }
      return { name: r.name, count: n };
    });
}

function remove(guildId, name) {
  return Number(db.prepare('DELETE FROM playlists WHERE guild_id = ? AND name = ?').run(String(guildId), name).changes || 0);
}

function count(guildId) {
  return Number(db.prepare('SELECT COUNT(*) AS c FROM playlists WHERE guild_id = ?').get(String(guildId)).c || 0);
}

module.exports = { save, get, exists, list, remove, count };
