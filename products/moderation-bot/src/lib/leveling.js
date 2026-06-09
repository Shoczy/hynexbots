'use strict';

// XP store — shares the moderation sqlite db (data/mod.db).
const { db } = require('./store');

db.exec(`
  CREATE TABLE IF NOT EXISTS levels (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    xp       INTEGER NOT NULL DEFAULT 0,
    last_msg INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_levels_guild ON levels (guild_id, xp);
`);

/** XP required to go from `level` to `level + 1` (grows with level). */
function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

/** Resolve a total XP amount into { level, into (xp into the level), need }. */
function levelFromXp(totalXp) {
  let level = 0;
  let xp = Math.max(0, totalXp | 0);
  let need = xpForLevel(0);
  while (xp >= need) {
    xp -= need;
    level += 1;
    need = xpForLevel(level);
  }
  return { level, into: xp, need };
}

function getRow(guildId, userId) {
  return (
    db.prepare('SELECT xp, last_msg FROM levels WHERE guild_id = ? AND user_id = ?').get(String(guildId), String(userId)) || {
      xp: 0,
      last_msg: 0,
    }
  );
}

function setXp(guildId, userId, xp) {
  db.prepare(
    `INSERT INTO levels (guild_id, user_id, xp, last_msg) VALUES (?, ?, ?, 0)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = excluded.xp`,
  ).run(String(guildId), String(userId), Math.max(0, xp | 0));
}

/** Add XP and stamp last-message time. Returns { before, after }. */
function addXp(guildId, userId, amount, now) {
  const row = getRow(guildId, userId);
  const after = row.xp + amount;
  db.prepare(
    `INSERT INTO levels (guild_id, user_id, xp, last_msg) VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = excluded.xp, last_msg = excluded.last_msg`,
  ).run(String(guildId), String(userId), after, now);
  return { before: row.xp, after };
}

function rank(guildId, userId) {
  const all = db.prepare('SELECT user_id FROM levels WHERE guild_id = ? ORDER BY xp DESC').all(String(guildId));
  const idx = all.findIndex((r) => r.user_id === String(userId));
  return { position: idx === -1 ? null : idx + 1, total: all.length };
}

function top(guildId, n = 10) {
  return db.prepare('SELECT user_id, xp FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(String(guildId), n);
}

module.exports = { xpForLevel, levelFromXp, getRow, setXp, addXp, rank, top };
