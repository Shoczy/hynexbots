'use strict';

const { cfg } = require('../lib/state');
const { make } = require('../lib/embeds');
const lv = require('../lib/leveling');

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Award voice XP for everyone actively listening in a voice channel. Called on an
 * interval (≈ once per minute). "Active" = not a bot, not deafened/suppressed, and
 * not alone (needs at least one other human in the channel).
 */
async function tickVoice(client) {
  if (!cfg('modules.leveling', false)) return;
  const conf = cfg('leveling', {});
  const noXp = conf.noXpRoleIds || [];
  const min = conf.xpPerMessage?.min ?? 15;
  const max = conf.xpPerMessage?.max ?? 25;

  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (!channel.isVoiceBased?.()) continue;
      if (channel.id === guild.afkChannelId) continue;
      const humans = channel.members.filter((m) => !m.user.bot);
      if (humans.size < 2) continue; // need company to earn

      for (const member of humans.values()) {
        const vs = member.voice;
        if (vs?.selfDeaf || vs?.deaf || vs?.suppress) continue; // not actively listening
        if (noXp.some((r) => member.roles.cache.has(r))) continue;

        const gain = randInt(Math.min(min, max), Math.max(min, max));
        const { before, after } = lv.addXp(guild.id, member.id, gain, Date.now());
        const lb = lv.levelFromXp(before).level;
        const la = lv.levelFromXp(after).level;
        if (la > lb) await onLevelUp(guild, member, la, conf);
      }
    }
  }
}

async function onLevelUp(guild, member, level, conf) {
  const earned = (conf.rewards || [])
    .filter((r) => r.roleId && r.level <= level)
    .sort((a, b) => a.level - b.level);

  if (earned.length) {
    const stack = conf.stackRewards !== false;
    const grant = stack ? earned.map((r) => r.roleId) : [earned[earned.length - 1].roleId];
    for (const id of grant) {
      try {
        await member.roles.add(id, `Level ${level} reward`);
      } catch {
        /* hierarchy / perms */
      }
    }
    if (!stack) {
      const keep = new Set(grant);
      for (const r of earned) {
        if (!keep.has(r.roleId) && member.roles.cache.has(r.roleId)) {
          await member.roles.remove(r.roleId, 'Higher level reward replaces lower').catch(() => {});
        }
      }
    }
  }

  const lu = conf.levelUp || {};
  if (lu.enabled === false) return;
  const text = (lu.message || 'GG {user}, you reached level {level}! 🎉')
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{level}', String(level))
    .replaceAll('{server}', guild.name);

  // No message context in voice — announce only if a channel is configured.
  const ch = lu.channelId ? guild.channels.cache.get(lu.channelId) : null;
  if (ch && ch.isTextBased?.()) ch.send({ embeds: [make({ description: text })] }).catch(() => {});
}

module.exports = { tickVoice };
