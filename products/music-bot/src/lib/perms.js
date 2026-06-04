'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { music, cfg } = require('./state');

/** DJ = guild owner, an administrator, or a configured DJ role. */
function isDJ(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  const djRoleIds = music().djRoleIds || [];
  return djRoleIds.some((id) => member.roles.cache.has(id));
}

/**
 * Can this member use a DJ-gated control? When `music.djOnly` is off, everyone
 * can; when on, only DJs.
 */
function canControl(member) {
  return !music().djOnly || isDJ(member);
}

/** Per-command dashboard gate (enable + role restrictions). */
function commandGate(name, member) {
  const entry = cfg('commands', {})[name];
  if (entry && entry.enabled === false) return { allowed: false, reason: 'disabled' };
  const roles = (entry && entry.roles) || [];
  if (roles.length) {
    const privileged =
      member.id === member.guild?.ownerId || member.permissions?.has(PermissionFlagsBits.Administrator);
    if (!privileged && !roles.some((id) => member.roles.cache.has(id))) return { allowed: false, reason: 'role' };
  }
  return { allowed: true };
}

/**
 * Combined authorization. `command.djControl` commands additionally require DJ
 * when djOnly is enabled.
 */
function authorize(command, member) {
  const gate = commandGate(command.name, member);
  if (!gate.allowed) return { ok: false, reason: gate.reason };
  if (command.djControl && !canControl(member)) return { ok: false, reason: 'dj' };
  return { ok: true };
}

const DENY_MESSAGE = {
  disabled: 'That command is disabled for this server.',
  role: 'You don\'t have a role allowed to use that command.',
  dj: 'Only DJs can use that while DJ-only mode is on.',
};

module.exports = { isDJ, canControl, commandGate, authorize, DENY_MESSAGE, PermissionFlagsBits };
