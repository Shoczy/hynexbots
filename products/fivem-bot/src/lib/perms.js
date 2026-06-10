'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { cfg } = require('./state');

/** Admin or guild owner — the implicit "staff" floor for privileged commands. */
function isAdmin(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  return Boolean(member.permissions?.has(PermissionFlagsBits.Administrator));
}

/**
 * Per-command gate driven by dashboard config (settings.commands[name]):
 *   - missing entry          → allowed (default on)
 *   - { enabled: false }     → blocked ('disabled')
 *   - { roles: [...] }       → caller must hold one of those roles (or be admin/owner)
 */
function commandGate(name, member) {
  const entry = cfg('commands', {})[name];
  if (entry && entry.enabled === false) return { allowed: false, reason: 'disabled' };

  const roles = (entry && entry.roles) || [];
  if (roles.length) {
    const hasRole = roles.some((id) => member.roles.cache.has(id));
    if (!isAdmin(member) && !hasRole) return { allowed: false, reason: 'role' };
  }
  return { allowed: true };
}

/**
 * Combined authorization, shared by the slash and prefix paths:
 *   1. dashboard per-command gate (enabled + role restrictions)
 *   2. permission floor — privileged commands need admin or the native perm
 * Returns { ok: true } or { ok: false, reason: 'disabled' | 'role' | 'perm' }.
 */
function authorize(command, member) {
  const gate = commandGate(command.name, member);
  if (!gate.allowed) return { ok: false, reason: gate.reason };
  if (command.requiredPerm) {
    if (!isAdmin(member) && !member.permissions?.has(command.requiredPerm)) {
      return { ok: false, reason: 'perm' };
    }
  }
  return { ok: true };
}

const DENY_MESSAGE = {
  disabled: 'That command is disabled for this server.',
  role: 'You don\'t have a role allowed to use that command.',
  perm: 'You don\'t have permission to use that command.',
};

module.exports = { isAdmin, commandGate, authorize, DENY_MESSAGE, PermissionFlagsBits };
