'use strict';

const store = require('../lib/store');

/**
 * Remove any temp-roles whose timer has elapsed. A 60s sweep (rather than
 * per-role timers) is simple and survives restarts — expired roles come off
 * within a minute of their deadline.
 */
async function sweep(client) {
  const due = store.dueTempRoles();
  for (const row of due) {
    try {
      const guild = await client.guilds.fetch(row.guild_id).catch(() => null);
      const member = guild ? await guild.members.fetch(row.user_id).catch(() => null) : null;
      if (member && member.roles.cache.has(row.role_id)) {
        await member.roles.remove(row.role_id, 'Temp-role expired').catch(() => {});
      }
    } finally {
      store.removeTempRoleRow(row.id);
    }
  }
}

function startSweeper(client) {
  sweep(client).catch(() => {});
  const timer = setInterval(() => sweep(client).catch(() => {}), 60_000);
  if (timer.unref) timer.unref();
}

module.exports = { startSweeper, sweep };
