'use strict';

/**
 * Command → group map, mirroring the config-service COMMAND_GROUPS for the
 * commands this bot ships. The same runtime powers two products (Security and
 * Community); the resolved `features.commandGroups` decide which commands a
 * given bot actually exposes, so a Community bot never answers /ban and a
 * Security bot never answers /rank.
 */
const COMMAND_GROUP = {
  // moderation
  ban: 'moderation',
  kick: 'moderation',
  mute: 'moderation',
  unmute: 'moderation',
  warn: 'moderation',
  warnings: 'moderation',
  purge: 'moderation',
  lockdown: 'moderation',
  slowmode: 'moderation',
  temprole: 'moderation',
  case: 'moderation',
  // verification
  'verify-panel': 'verification',
  // reaction roles
  'roles-panel': 'reactionroles',
  // giveaways
  giveaway: 'giveaways',
  // suggestions
  suggest: 'suggestions',
  // leveling
  rank: 'leveling',
  levels: 'leveling',
  setxp: 'leveling',
  // utility (always available)
  help: 'utility',
  ping: 'utility',
  serverinfo: 'utility',
  userinfo: 'utility',
  avatar: 'utility',
};

/**
 * Is `name` in scope for the given resolved features? When features are unknown
 * (service not reached yet) everything is allowed so the bot still works.
 * Utility and unmapped commands are always allowed.
 */
function commandInScope(name, features) {
  const groups = features && Array.isArray(features.commandGroups) ? features.commandGroups : null;
  if (!groups) return true;
  const group = COMMAND_GROUP[name];
  if (!group || group === 'utility') return true;
  return groups.includes(group);
}

module.exports = { COMMAND_GROUP, commandInScope };
