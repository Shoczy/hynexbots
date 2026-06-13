'use strict';

const { cfg } = require('../lib/state');
const store = require('../lib/store');

/** XP needed to go from `level` to `level + 1`. */
function xpForNext(level) {
  return 5 * level * level + 50 * level + 100;
}

/** Resolve a total-XP figure into { level, into, need }. */
function levelInfo(totalXp) {
  let level = 0;
  let xp = Math.max(0, totalXp | 0);
  let need = xpForNext(0);
  while (xp >= need) {
    xp -= need;
    level += 1;
    need = xpForNext(level);
  }
  return { level, into: xp, need, total: totalXp };
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function applyRewards(member, level, lv) {
  const rewards = (lv.rewards || []).filter((r) => r.roleId && r.level <= level).sort((a, b) => a.level - b.level);
  if (!rewards.length) return;
  if (lv.stackRewards) {
    for (const r of rewards) if (!member.roles.cache.has(r.roleId)) await member.roles.add(r.roleId, 'Level reward').catch(() => {});
  } else {
    const highest = rewards[rewards.length - 1];
    if (!member.roles.cache.has(highest.roleId)) await member.roles.add(highest.roleId, 'Level reward').catch(() => {});
    for (const r of rewards.slice(0, -1)) if (member.roles.cache.has(r.roleId)) await member.roles.remove(r.roleId, 'Level reward (highest only)').catch(() => {});
  }
}

async function announce(message, member, level, lv) {
  const lu = lv.levelUp || {};
  if (lu.enabled === false) return;
  const text = String(lu.message || 'GG {user}, you reached level {level}! 🎉')
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{level}', String(level))
    .replaceAll('{server}', message.guild.name);
  const channel = lu.channelId ? await message.client.channels.fetch(lu.channelId).catch(() => null) : message.channel;
  if (channel?.isTextBased?.()) await channel.send({ content: text, allowedMentions: { users: [member.id] } }).catch(() => {});
}

/** Award XP for a message (cooldown + no-XP roles respected). Non-blocking. */
async function handleMessage(message) {
  if (!cfg('modules.leveling', false)) return;
  const member = message.member;
  if (!member) return;
  const lv = cfg('leveling', {});
  if ((lv.noXpRoleIds || []).some((id) => member.roles.cache.has(id))) return;

  const now = Date.now();
  const entry = store.getXp(message.guild.id, member.id);
  if (now - entry.last_msg < (lv.cooldownSec ?? 60) * 1000) return;

  const xpCfg = lv.xpPerMessage || { min: 15, max: 25 };
  const min = Math.max(0, xpCfg.min | 0);
  const max = Math.max(min, xpCfg.max | 0);
  const before = levelInfo(entry.xp).level;
  const total = store.addXp(message.guild.id, member.id, rand(min, max), now);
  const after = levelInfo(total).level;
  if (after > before) {
    await applyRewards(member, after, lv);
    await announce(message, member, after, lv);
  }
}

module.exports = { handleMessage, levelInfo, xpForNext };
