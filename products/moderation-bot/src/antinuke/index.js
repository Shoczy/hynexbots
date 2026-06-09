'use strict';

const { AuditLogEvent } = require('discord.js');
const { cfg } = require('../lib/state');
const { make, COLORS } = require('../lib/embeds');
const { getLogChannel } = require('../lib/log');

// executorId -> { [kind]: number[] (timestamps) }. In-memory, per-process.
const counters = new Map();

function conf() {
  return cfg('antiNuke', {});
}

/** The owner, the bot itself, and whitelisted users/roles are never punished. */
function isExempt(guild, userId) {
  const a = conf();
  if (!userId) return true;
  if (userId === guild.ownerId) return true;
  if (userId === guild.client.user.id) return true;
  if ((a.whitelistUserIds || []).includes(userId)) return true;
  const member = guild.members.cache.get(userId);
  if (member && (a.whitelistRoleIds || []).some((r) => member.roles.cache.has(r))) return true;
  return false;
}

function record(userId, kind, windowSec) {
  const now = Date.now();
  let u = counters.get(userId);
  if (!u) {
    u = {};
    counters.set(userId, u);
  }
  const arr = (u[kind] || []).filter((t) => now - t <= windowSec * 1000);
  arr.push(now);
  u[kind] = arr;
  return arr.length;
}

/** Find who just performed a destructive action via the audit log (recent only). */
async function findExecutor(guild, auditType, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditType, limit: 5 });
    const entry =
      logs.entries.find((e) => (targetId ? (e.target?.id || e.targetId) === targetId : true)) || logs.entries.first();
    if (!entry) return null;
    if (Date.now() - entry.createdTimestamp > 15_000) return null; // stale — not this event
    return entry.executorId || entry.executor?.id || null;
  } catch {
    return null; // missing View Audit Log permission
  }
}

async function punish(guild, userId) {
  const a = conf();
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  const reason = 'Anti-nuke: exceeded destructive-action limit';
  try {
    if (a.punishment === 'ban') {
      await member.ban({ reason });
    } else if (a.punishment === 'kick') {
      await member.kick(reason);
    } else {
      const removable = member.roles.cache.filter((r) => r.id !== guild.id && r.editable);
      if (removable.size) await member.roles.remove([...removable.keys()], reason);
    }
  } catch {
    /* role hierarchy / missing perms */
  }
}

async function alert(guild, text) {
  const a = conf();
  let ch = a.alertChannelId ? guild.channels.cache.get(a.alertChannelId) : null;
  if (!(ch && ch.isTextBased?.())) ch = getLogChannel(guild);
  if (!ch) return;
  ch.send({ embeds: [make({ title: '🚨 Anti-Nuke triggered', description: text, color: COLORS.danger })] }).catch(() => {});
}

async function handle(guild, kind, auditType, targetId) {
  if (!guild || !cfg('modules.antinuke', false)) return;
  const lim = conf().limits?.[kind];
  if (!lim || !lim.enabled) return;

  const executorId = await findExecutor(guild, auditType, targetId);
  if (!executorId || isExempt(guild, executorId)) return;

  const count = record(executorId, kind, lim.perSeconds);
  if (count < lim.max) return;

  await punish(guild, executorId);
  await alert(
    guild,
    `<@${executorId}> hit the **${kind}** limit (${count} in ${lim.perSeconds}s) — applied **${conf().punishment}**.`,
  );
  counters.delete(executorId); // reset so we don't punish repeatedly for the same burst
}

module.exports = {
  onChannelDelete: (channel) => handle(channel.guild, 'channelDelete', AuditLogEvent.ChannelDelete, channel.id),
  onRoleDelete: (role) => handle(role.guild, 'roleDelete', AuditLogEvent.RoleDelete, role.id),
  onGuildBanAdd: (ban) => handle(ban.guild, 'ban', AuditLogEvent.MemberBanAdd, ban.user.id),
  onGuildMemberRemove: (member) => handle(member.guild, 'kick', AuditLogEvent.MemberKick, member.id),
};
