'use strict';

const store = require('../lib/store');

/**
 * Lift any temp-bans whose timer has elapsed. A 60s sweep (rather than per-ban
 * timers) is simple and survives restarts — expired bans are removed within a
 * minute of their deadline. Self-heals: a member unbanned early just no-ops.
 */
async function sweep(client) {
  const due = store.dueTempBans();
  for (const row of due) {
    try {
      const guild = await client.guilds.fetch(row.guild_id).catch(() => null);
      if (guild) await guild.bans.remove(row.user_id, 'Temp-ban expired').catch(() => {});
    } finally {
      store.removeTempBan(row.guild_id, row.user_id);
    }
  }
}

function startSweeper(client) {
  sweep(client).catch(() => {});
  const timer = setInterval(() => sweep(client).catch(() => {}), 60_000);
  if (timer.unref) timer.unref();
}

module.exports = { startSweeper, sweep };
