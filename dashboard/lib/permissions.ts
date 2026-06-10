// Granular team-member permission tokens, mirrored from the bot's config-service
// (bot/src/config-service/permissions.js). Each editable config tab is its own
// token; `process` covers start/stop/restart. The owner implicitly has them all.

export const EDIT_TABS = [
  'basics',
  'modules',
  'messages',
  'moderation',
  'verification',
  'reactionroles',
  'antinuke',
  'leveling',
  'fivem',
  'commands',
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  basics: 'Basics',
  modules: 'Modules',
  messages: 'Messages & Embeds',
  moderation: 'Moderation',
  verification: 'Verification',
  reactionroles: 'Reaction Roles',
  antinuke: 'Anti-Nuke',
  leveling: 'Leveling',
  fivem: 'FiveM',
  commands: 'Commands',
  process: 'Start / stop the bot',
};

export function permLabel(token: string): string {
  return PERMISSION_LABELS[token] || token;
}
