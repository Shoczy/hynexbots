'use strict';

/**
 * Builds the OAuth2 "add to server" invite URL for a sold bot, requesting the
 * Discord permissions that product type actually needs — so a customer can add
 * their bot in one click without guessing scopes or over-granting Administrator.
 */
const { PermissionFlagsBits: P } = require('discord.js');

// Baseline every bot needs to function in a text channel.
const COMMON = ['ViewChannel', 'SendMessages', 'EmbedLinks', 'ReadMessageHistory', 'AttachFiles'];

const PERMS_BY_TYPE = {
  // Sold as "Security".
  moderation: [...COMMON, 'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages', 'ManageRoles', 'ManageNicknames', 'ViewAuditLog'],
  // FiveM: ManageRoles for the whitelist role; the rest is messaging.
  fivem: [...COMMON, 'ManageRoles'],
  // Bespoke builds: a broad (but non-Administrator) set covering all systems.
  custom: [...COMMON, 'ManageMessages', 'ManageRoles', 'ManageChannels', 'KickMembers', 'BanMembers', 'ModerateMembers', 'AddReactions', 'Connect', 'Speak'],
};

/** Permission bitfield (as a string) for a product type. */
function permissionsFor(type) {
  const names = PERMS_BY_TYPE[type] || PERMS_BY_TYPE.custom;
  let bits = 0n;
  for (const n of names) if (P[n] != null) bits |= P[n];
  return bits.toString();
}

/** Full OAuth2 invite URL for a bot, or null if no app id. */
function inviteUrl(appId, type) {
  if (!appId) return null;
  const scope = encodeURIComponent('bot applications.commands');
  return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(appId)}&scope=${scope}&permissions=${permissionsFor(type)}`;
}

module.exports = { permissionsFor, inviteUrl, PERMS_BY_TYPE };
