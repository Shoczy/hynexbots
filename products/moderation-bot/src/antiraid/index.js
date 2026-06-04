'use strict';

const { mod } = require('../lib/state');
const { logModAction } = require('../lib/log');
const { info } = require('../lib/embeds');

// Rolling join timestamps per guild, for join-rate detection.
const joins = new Map();
// Cooldown so a raid alert isn't spammed once tripped.
const alerted = new Map();

/** Apply anti-raid checks to a newly joined member. Returns true if it acted. */
async function handleMemberAdd(member) {
  const ar = mod().antiRaid || {};
  if (!ar.enabled || member.user.bot) return false;

  // ── Minimum account age gate ──
  if (ar.minAccountAgeDays > 0) {
    const ageDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;
    if (ageDays < ar.minAccountAgeDays) {
      await kick(member, `Account younger than ${ar.minAccountAgeDays}d (anti-raid)`);
      await logModAction(
        member.guild,
        info('Anti-Raid — Account Too New', `**User:** ${member.user.tag} (\`${member.id}\`)\n**Account age:** ${ageDays.toFixed(1)} days\n**Required:** ${ar.minAccountAgeDays} days`),
      );
      return true;
    }
  }

  // ── Join-rate spike ──
  if (ar.joinRate?.enabled) {
    const now = Date.now();
    const windowMs = ar.joinRate.perSeconds * 1000;
    const recent = (joins.get(member.guild.id) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    joins.set(member.guild.id, recent);

    if (recent.length >= ar.joinRate.joins) {
      await kick(member, 'Join-rate spike (anti-raid)');
      const last = alerted.get(member.guild.id) || 0;
      if (now - last > windowMs) {
        alerted.set(member.guild.id, now);
        await logModAction(
          member.guild,
          info('🚨 Anti-Raid — Join Spike', `Detected **${recent.length}** joins in ${ar.joinRate.perSeconds}s (threshold ${ar.joinRate.joins}). New joiners are being removed.`),
        );
      }
      return true;
    }
  }

  return false;
}

async function kick(member, reason) {
  if (!member.kickable) return;
  try {
    await member.kick(reason);
  } catch {
    /* ignore */
  }
}

module.exports = { handleMemberAdd };
