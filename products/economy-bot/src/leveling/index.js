'use strict';

const { cfg } = require('../lib/state');
const { make } = require('../lib/embeds');
const lv = require('../lib/leveling');

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Award XP for a message (cooldown + no-XP roles respected); announce level-ups. */
async function handleMessage(message) {
  if (!cfg('modules.leveling', false)) return;
  const member = message.member;
  if (!member) return;

  const conf = cfg('leveling', {});
  const noXp = conf.noXpRoleIds || [];
  if (noXp.some((r) => member.roles.cache.has(r))) return;

  const now = Date.now();
  const row = lv.getRow(message.guild.id, member.id);
  const cd = (conf.cooldownSec ?? 60) * 1000;
  if (now - row.last_msg < cd) return;

  const min = conf.xpPerMessage?.min ?? 15;
  const max = conf.xpPerMessage?.max ?? 25;
  const gain = randInt(Math.min(min, max), Math.max(min, max));
  const { before, after } = lv.addXp(message.guild.id, member.id, gain, now);

  const levelBefore = lv.levelFromXp(before).level;
  const levelAfter = lv.levelFromXp(after).level;
  if (levelAfter > levelBefore) await onLevelUp(message, member, levelAfter, conf);
}

async function onLevelUp(message, member, level, conf) {
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
    .replaceAll('{server}', message.guild.name);

  let ch = lu.channelId ? message.guild.channels.cache.get(lu.channelId) : message.channel;
  if (!(ch && ch.isTextBased?.())) ch = message.channel;
  ch.send({ embeds: [make({ description: text })] }).catch(() => {});
}

module.exports = { handleMessage };
