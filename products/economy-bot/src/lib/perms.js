'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { cfg } = require('./state');

/**
 * Per-command gate driven by dashboard config (settings.commands[name]):
 *   missing → allowed; { enabled:false } → blocked; { roles:[...] } → must hold one.
 * Economy commands are open to everyone by default; only the dashboard gate applies.
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

function authorize(command, member) {
  const gate = commandGate(command.name, member);
  return { ok: gate.allowed, reason: gate.reason };
}

const DENY_MESSAGE = {
  disabled: 'That command is disabled for this server.',
  role: 'You don\'t have a role allowed to use that command.',
};

module.exports = { commandGate, authorize, DENY_MESSAGE, PermissionFlagsBits };
