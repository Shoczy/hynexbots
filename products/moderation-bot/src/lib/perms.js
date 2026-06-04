'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { mod, cfg } = require('./state');

/**
 * Is this member a moderator? True when they're an admin, the guild owner, or
 * hold one of the configured mod roles (moderation.roles.modRoleIds).
 */
function isMod(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  const modRoleIds = mod().roles?.modRoleIds || [];
  return modRoleIds.some((id) => member.roles.cache.has(id));
}

/**
 * Per-command gate driven by dashboard config (settings.commands[name]):
 *   - missing entry          → allowed (default on)
 *   - { enabled: false }     → blocked ('disabled')
 *   - { roles: [...] }       → caller must hold one of those roles (or be admin/owner)
 *
 * Returns { allowed: true } or { allowed: false, reason }.
 */
function commandGate(name, member) {
  const entry = cfg('commands', {})[name];
  if (entry && entry.enabled === false) return { allowed: false, reason: 'disabled' };

  const roles = (entry && entry.roles) || [];
  if (roles.length) {
    const privileged = member.id === member.guild?.ownerId || member.permissions?.has(PermissionFlagsBits.Administrator);
    const hasRole = roles.some((id) => member.roles.cache.has(id));
    if (!privileged && !hasRole) return { allowed: false, reason: 'role' };
  }
  return { allowed: true };
}

/**
 * Combined authorization for a command, shared by the slash and prefix paths:
 *   1. dashboard per-command gate (enabled + role restrictions)
 *   2. permission floor — privileged commands need isMod() or the native perm
 * Returns { ok: true } or { ok: false, reason: 'disabled' | 'role' | 'perm' }.
 */
function authorize(command, member) {
  const gate = commandGate(command.name, member);
  if (!gate.allowed) return { ok: false, reason: gate.reason };
  if (command.requiredPerm) {
    if (!isMod(member) && !member.permissions?.has(command.requiredPerm)) {
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

module.exports = { isMod, commandGate, authorize, DENY_MESSAGE, PermissionFlagsBits };
