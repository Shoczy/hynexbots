'use strict';

const { mod } = require('./state');
const { make, ok, err, COLORS } = require('./embeds');
const { commandReply } = require('./commandEmbed');
const { logModAction } = require('./log');
const store = require('./store');

const MAX_TIMEOUT_MS = 28 * 86_400_000; // Discord cap: 28 days
const ESCALATION_TIMEOUT_MS = 60 * 60_000; // default 1h for a "timeout" escalation

/**
 * A clean, consistent moderation card: the action as the title, the target's
 * avatar as the thumbnail, and structured fields. Used for both the command
 * reply and the audit-log entry so they always match.
 */
function actionCard(guild, { title, color, target, moderator, reason, fields = [] }) {
  return make({
    author: { name: 'Moderation', iconURL: guild.iconURL() || undefined },
    title,
    color,
    thumbnail: target?.displayAvatarURL ? target.displayAvatarURL({ size: 256 }) : undefined,
    fields: [
      target ? { name: 'Member', value: `${target.tag}\n\`${target.id}\``, inline: true } : null,
      { name: 'Moderator', value: moderator ? `${moderator.tag}` : 'System', inline: true },
      ...fields,
      reason ? { name: 'Reason', value: reason.slice(0, 1024) } : null,
    ].filter(Boolean),
  });
}

/** Can the bot act on this member? (role hierarchy + kick/ban-ability). */
function actionable(guild, target) {
  const me = guild.members.me;
  if (!me || !target) return false;
  if (target.id === guild.ownerId) return false;
  if (target.id === me.id) return false;
  return me.roles.highest.comparePositionTo(target.roles.highest) > 0;
}

async function doBan(guild, targetUser, { moderator, reason = 'No reason provided', deleteDays = 0 } = {}) {
  const member = guild.members.cache.get(targetUser.id);
  if (member && !actionable(guild, member)) return { ok: false, embed: err('I can\'t ban that member (role hierarchy).') };
  try {
    await guild.bans.create(targetUser.id, {
      reason: `${reason} — by ${moderator?.tag || 'system'}`,
      deleteMessageSeconds: Math.min(7, Math.max(0, deleteDays)) * 86_400,
    });
  } catch {
    return { ok: false, embed: err('Failed to ban — check my permissions and role position.') };
  }
  const card = actionCard(guild, { title: 'Member Banned', color: COLORS.danger, target: targetUser, moderator, reason });
  await logModAction(guild, card);
  const custom = commandReply('ban', { user: targetUser.tag, moderator: moderator?.tag || 'system', reason, server: guild.name });
  return custom ? { ok: true, reply: custom } : { ok: true, embed: card };
}

async function doKick(guild, targetMember, { moderator, reason = 'No reason provided' } = {}) {
  if (!actionable(guild, targetMember)) return { ok: false, embed: err('I can\'t kick that member (role hierarchy).') };
  try {
    await targetMember.kick(`${reason} — by ${moderator?.tag || 'system'}`);
  } catch {
    return { ok: false, embed: err('Failed to kick — check my permissions and role position.') };
  }
  const card = actionCard(guild, { title: 'Member Kicked', color: COLORS.danger, target: targetMember.user, moderator, reason });
  await logModAction(guild, card);
  const custom = commandReply('kick', { user: targetMember.user.tag, moderator: moderator?.tag || 'system', reason, server: guild.name });
  return custom ? { ok: true, reply: custom } : { ok: true, embed: card };
}

/**
 * Mute a member. Uses the configured mute role when set; otherwise falls back to
 * a native Discord timeout. `durationMs` is optional (native timeouts require
 * one — defaults to 1h, capped at 28d; the mute role can be indefinite).
 */
async function doMute(guild, targetMember, { moderator, reason = 'No reason provided', durationMs = 0 } = {}) {
  if (!actionable(guild, targetMember)) return { ok: false, embed: err('I can\'t mute that member (role hierarchy).') };
  const muteRoleId = mod().roles?.muteRoleId;

  if (muteRoleId) {
    const role = guild.roles.cache.get(muteRoleId);
    if (!role) return { ok: false, embed: err('The configured mute role no longer exists — update it in the dashboard.') };
    try {
      await targetMember.roles.add(role, `${reason} — by ${moderator?.tag || 'system'}`);
    } catch {
      return { ok: false, embed: err('Failed to add the mute role — check my permissions and role position.') };
    }
    if (durationMs) scheduleUnmute(targetMember, role, durationMs);
    const card = actionCard(guild, {
      title: 'Member Muted',
      color: COLORS.warning,
      target: targetMember.user,
      moderator,
      reason,
      fields: durationMs ? [{ name: 'Duration', value: humanizeMs(durationMs), inline: true }] : [],
    });
    await logModAction(guild, card);
    const custom = commandReply('mute', { user: targetMember.user.tag, moderator: moderator?.tag || 'system', reason, duration: durationMs ? humanizeMs(durationMs) : 'indefinite', server: guild.name });
    return custom ? { ok: true, reply: custom } : { ok: true, embed: card };
  }

  // No mute role → native timeout.
  const ms = Math.min(MAX_TIMEOUT_MS, durationMs || ESCALATION_TIMEOUT_MS);
  try {
    await targetMember.timeout(ms, `${reason} — by ${moderator?.tag || 'system'}`);
  } catch {
    return { ok: false, embed: err('Failed to timeout — check my permissions and role position.') };
  }
  const card = actionCard(guild, {
    title: 'Member Timed Out',
    color: COLORS.warning,
    target: targetMember.user,
    moderator,
    reason,
    fields: [{ name: 'Duration', value: humanizeMs(ms), inline: true }],
  });
  await logModAction(guild, card);
  const custom = commandReply('mute', { user: targetMember.user.tag, moderator: moderator?.tag || 'system', reason, duration: humanizeMs(ms), server: guild.name });
  return custom ? { ok: true, reply: custom } : { ok: true, embed: card };
}

async function doUnmute(guild, targetMember, { moderator } = {}) {
  const muteRoleId = mod().roles?.muteRoleId;
  let acted = false;
  if (muteRoleId && targetMember.roles.cache.has(muteRoleId)) {
    try {
      await targetMember.roles.remove(muteRoleId, `Unmuted by ${moderator?.tag || 'system'}`);
      acted = true;
    } catch {
      return { ok: false, embed: err('Failed to remove the mute role.') };
    }
  }
  if (targetMember.isCommunicationDisabled?.()) {
    try {
      await targetMember.timeout(null, `Unmuted by ${moderator?.tag || 'system'}`);
      acted = true;
    } catch {
      /* ignore */
    }
  }
  if (!acted) return { ok: false, embed: err(`**${targetMember.user.tag}** isn't muted.`) };
  const card = actionCard(guild, { title: 'Member Unmuted', color: COLORS.success, target: targetMember.user, moderator });
  await logModAction(guild, card);
  const custom = commandReply('unmute', { user: targetMember.user.tag, moderator: moderator?.tag || 'system', server: guild.name });
  return custom ? { ok: true, reply: custom } : { ok: true, embed: card };
}

/**
 * Warn a member, then apply the highest matching escalation
 * (moderation.warnings.escalations) for the resulting active-warning count.
 */
async function doWarn(guild, targetMember, { moderator, reason = 'No reason provided' } = {}) {
  store.addWarning(guild.id, targetMember.id, moderator?.id || 'system', reason);
  const cfgWarn = mod().warnings || {};
  const count = store.activeWarnings(guild.id, targetMember.id, cfgWarn.expireDays || 0).length;

  // Find the strongest escalation whose threshold the user has now reached.
  const hit = (cfgWarn.escalations || [])
    .filter((e) => count >= e.threshold)
    .sort((a, b) => b.threshold - a.threshold)[0];

  let autoAction = '';
  if (hit) {
    autoAction = await applyEscalation(guild, targetMember, hit.action, moderator, `Reached ${count} warnings`);
  }

  const fields = [{ name: 'Active warnings', value: String(count), inline: true }];
  if (autoAction) fields.push({ name: 'Auto-action', value: autoAction, inline: true });
  const card = actionCard(guild, { title: 'Member Warned', color: COLORS.warning, target: targetMember.user, moderator, reason, fields });
  await logModAction(guild, card);
  const custom = commandReply('warn', { user: targetMember.user.tag, moderator: moderator?.tag || 'system', reason, count, server: guild.name });
  return custom ? { ok: true, reply: custom } : { ok: true, embed: card };
}

/** Apply an escalation action by name. Returns a short human label, or '' on failure. */
async function applyEscalation(guild, member, action, moderator, reason) {
  switch (action) {
    case 'ban': {
      const r = await doBan(guild, member.user, { moderator, reason });
      return r.ok ? 'banned' : '';
    }
    case 'kick': {
      const r = await doKick(guild, member, { moderator, reason });
      return r.ok ? 'kicked' : '';
    }
    case 'mute': {
      const r = await doMute(guild, member, { moderator, reason });
      return r.ok ? 'muted' : '';
    }
    case 'timeout':
    default: {
      const r = await doMute(guild, member, { moderator, reason, durationMs: ESCALATION_TIMEOUT_MS });
      return r.ok ? `timed out (${humanizeMs(ESCALATION_TIMEOUT_MS)})` : '';
    }
  }
}

function listWarnings(guild, userId) {
  const expireDays = mod().warnings?.expireDays || 0;
  return store.activeWarnings(guild.id, userId, expireDays);
}

function clearWarnings(guild, userId) {
  return store.clearWarnings(guild.id, userId);
}

async function doPurge(channel, count, { filterUserId } = {}) {
  const n = Math.min(100, Math.max(1, count));
  let messages = await channel.messages.fetch({ limit: filterUserId ? 100 : n });
  if (filterUserId) messages = messages.filter((m) => m.author.id === filterUserId).first(n);
  // bulkDelete only removes messages < 14 days old.
  const deletable = [...(messages.values?.() || messages)].filter((m) => Date.now() - m.createdTimestamp < 14 * 86_400_000);
  try {
    const removed = await channel.bulkDelete(deletable, true);
    return { ok: true, count: removed.size ?? deletable.length };
  } catch {
    return { ok: false };
  }
}

async function doLockdown(channel, { lock = true, moderator } = {}) {
  const everyone = channel.guild.roles.everyone;
  try {
    await channel.permissionOverwrites.edit(everyone, { SendMessages: lock ? false : null }, {
      reason: `${lock ? 'Lockdown' : 'Unlock'} by ${moderator?.tag || 'system'}`,
    });
  } catch {
    return { ok: false, embed: err('Failed to update channel permissions — check my role.') };
  }
  return { ok: true, embed: ok(lock ? '🔒 Channel locked.' : '🔓 Channel unlocked.') };
}

// ── helpers ───────────────────────────────────────────
function scheduleUnmute(member, role, ms) {
  const t = setTimeout(() => {
    member.roles.remove(role, 'Temporary mute expired').catch(() => {});
  }, Math.min(ms, MAX_TIMEOUT_MS));
  if (t.unref) t.unref();
}

function humanizeMs(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

module.exports = {
  doBan,
  doKick,
  doMute,
  doUnmute,
  doWarn,
  doPurge,
  doLockdown,
  listWarnings,
  clearWarnings,
  actionable,
  humanizeMs,
};
