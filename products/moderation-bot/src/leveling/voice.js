'use strict';

const { ChannelType } = require('discord.js');
const { cfg } = require('../lib/state');
const { multiplierFor, blockedByRole, award } = require('./index');

const SWEEP_MS = 60_000; // award once per voice-minute

/**
 * Is this member's current voice state earning XP? Recomputed live each sweep,
 * so the whole earner is stateless and survives restarts.
 */
function earning(member, lv) {
  const vs = member.voice;
  const channel = vs.channel;
  if (!channel) return false;

  const v = lv.voice || {};
  if (v.ignoreAfkChannel && member.guild.afkChannelId && channel.id === member.guild.afkChannelId) return false;
  if ((lv.noXpChannelIds || []).includes(channel.id)) return false;
  if (blockedByRole(member, lv)) return false;

  if (v.antiAfk) {
    // No farming while muted/deafened or sitting alone.
    if (vs.selfMute || vs.selfDeaf || vs.serverMute || vs.serverDeaf) return false;
    const humans = channel.members.filter((m) => !m.user.bot);
    if (humans.size < 2) return false;
  }
  return true;
}

/** One pass: give everyone actively in voice their per-minute XP. */
async function sweep(client) {
  if (!cfg('modules.leveling', false)) return;
  const lv = cfg('leveling', {});
  const v = lv.voice || {};
  if (!v.enabled) return;
  const perMin = Math.max(0, v.xpPerMinute | 0);
  if (!perMin) return;

  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) continue;
      for (const member of channel.members.values()) {
        if (member.user.bot || !earning(member, lv)) continue;
        const gained = Math.round(perMin * multiplierFor(member, lv));
        try {
          await award(member, gained, lv, { stampMsg: false });
        } catch {
          /* missing perms / member gone — skip */
        }
      }
    }
  }
}

/** Start the per-minute voice-XP loop. */
function start(client) {
  const tick = () => sweep(client).catch(() => {});
  const timer = setInterval(tick, SWEEP_MS);
  timer.unref?.();
  return timer;
}

module.exports = { start, sweep };
