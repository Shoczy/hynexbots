'use strict';

/**
 * Grantable permission tokens for invited team members.
 *
 * The owner of a bot implicitly has every permission and is the only one who can
 * manage the team. Invited members get a granular subset:
 *   - one token per editable config section (the tab id) → can view AND edit that
 *     section; sections they lack are hidden in the dashboard and rejected on save.
 *   - `process` → may start / stop / restart the hosted bot.
 *
 * Read-only views (live status, logs) are available to any member regardless of
 * their grants, so a member always sees the bot they help manage.
 */
const EDIT_TABS = ['basics', 'modules', 'messages', 'moderation', 'tickets', 'economy', 'music', 'commands'];
const PROCESS = 'process';
const ALL_PERMISSIONS = [...EDIT_TABS, PROCESS];

/** Drop anything that isn't a known permission token; de-dupe. */
function sanitizePermissions(arr) {
  if (!Array.isArray(arr)) return [];
  const set = new Set();
  for (const p of arr) if (ALL_PERMISSIONS.includes(p)) set.add(p);
  return [...set];
}

module.exports = { EDIT_TABS, PROCESS, ALL_PERMISSIONS, sanitizePermissions };
