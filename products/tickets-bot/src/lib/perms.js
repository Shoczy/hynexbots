'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { tickets, cfg } = require('./state');

/** Staff = guild owner, an administrator, or a configured ticket staff role. */
function isStaff(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  const staffRoleIds = tickets().staffRoleIds || [];
  return staffRoleIds.some((id) => member.roles.cache.has(id));
}

/**
 * Per-command gate driven by dashboard config (settings.commands[name]):
 *   missing → allowed; { enabled:false } → blocked; { roles:[...] } → must hold one.
 */
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
 * Combined authorization. `command.staffOnly` requires isStaff(); `command.adminOnly`
 * requires Administrator/owner. Both still honor the dashboard command gate.
 */
function authorize(command, member) {
  const gate = commandGate(command.name, member);
  if (!gate.allowed) return { ok: false, reason: gate.reason };
  if (command.adminOnly) {
    const admin = member.id === member.guild?.ownerId || member.permissions?.has(PermissionFlagsBits.Administrator);
    if (!admin) return { ok: false, reason: 'perm' };
  }
  if (command.staffOnly && !isStaff(member)) return { ok: false, reason: 'staff' };
  return { ok: true };
}

const DENY_MESSAGE = {
  disabled: 'That command is disabled for this server.',
  role: 'You don\'t have a role allowed to use that command.',
  perm: 'You need to be an administrator to use that command.',
  staff: 'Only ticket staff can use that command.',
};

module.exports = { isStaff, commandGate, authorize, DENY_MESSAGE, PermissionFlagsBits };
