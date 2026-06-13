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

/**
 * XP multiplier for a member from their roles (e.g. boosters earn 2×).
 * The most generous matching multiplier wins, so the rule is predictable.
 */
function multiplierFor(member, lv) {
  const matches = (lv.multipliers || [])
    .filter((m) => m.roleId && member.roles.cache.has(m.roleId))
    .map((m) => Number(m.multiplier) || 1);
  return matches.length ? Math.max(1, ...matches) : 1;
}

/** Does this member currently earn XP at all (no-XP roles respected)? */
function blockedByRole(member, lv) {
  return (lv.noXpRoleIds || []).some((id) => member.roles.cache.has(id));
}

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

/**
 * Announce a level-up. Posts to the configured channel, falling back to
 * `fallbackChannel` (the channel they leveled up in) when none is set. Voice
 * level-ups pass no fallback, so they only announce when a channel is configured.
 */
async function announce(guild, member, level, lv, fallbackChannel) {
  const lu = lv.levelUp || {};
  if (lu.enabled === false) return;
  const text = String(lu.message || 'GG {user}, you reached level {level}! 🎉')
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{level}', String(level))
    .replaceAll('{server}', guild.name);
  const channel = lu.channelId ? await guild.client.channels.fetch(lu.channelId).catch(() => null) : fallbackChannel;
  if (channel?.isTextBased?.()) await channel.send({ content: text, allowedMentions: { users: [member.id] } }).catch(() => {});
}

/**
 * Add XP to a member and handle a level-up (rewards + announcement). Shared by
 * the message and voice earners. `stampMsg` updates the message cooldown clock;
 * voice rewards leave it untouched so the two earners don't starve each other.
 */
async function award(member, amount, lv, { now = Date.now(), stampMsg = false, fallbackChannel = null } = {}) {
  if (amount <= 0) return false;
  const before = levelInfo(store.getXp(member.guild.id, member.id).xp).level;
  const total = stampMsg
    ? store.addXp(member.guild.id, member.id, amount, now)
    : store.addVoiceXp(member.guild.id, member.id, amount);
  const after = levelInfo(total).level;
  if (after <= before) return false;
  await applyRewards(member, after, lv);
  await announce(member.guild, member, after, lv, fallbackChannel);
  return true;
}

/** Award XP for a message (cooldown + no-XP roles/channels respected). Non-blocking. */
async function handleMessage(message) {
  if (!cfg('modules.leveling', false)) return;
  const member = message.member;
  if (!member || member.user.bot) return;
  const lv = cfg('leveling', {});
  if (blockedByRole(member, lv)) return;
  const noXpChannels = lv.noXpChannelIds || [];
  if (noXpChannels.includes(message.channelId) || (message.channel.parentId && noXpChannels.includes(message.channel.parentId))) return;

  const now = Date.now();
  const entry = store.getXp(message.guild.id, member.id);
  if (now - entry.last_msg < (lv.cooldownSec ?? 60) * 1000) return;

  const xpCfg = lv.xpPerMessage || { min: 15, max: 25 };
  const min = Math.max(0, xpCfg.min | 0);
  const max = Math.max(min, xpCfg.max | 0);
  const gained = Math.round(rand(min, max) * multiplierFor(member, lv));
  await award(member, gained, lv, { now, stampMsg: true, fallbackChannel: message.channel });
}

module.exports = { handleMessage, levelInfo, xpForNext, multiplierFor, blockedByRole, award };
