'use strict';

const { mod, cfg } = require('./state');

/**
 * Resolve the log channel: the moderation logging channel takes precedence,
 * falling back to the generic basics.logChannelId. Returns a sendable channel
 * or null.
 */
function getLogChannel(guild) {
  if (!guild) return null;
  const id = mod().logging?.channelId || cfg('basics.logChannelId', '');
  if (!id) return null;
  const ch = guild.channels.cache.get(id);
  return ch && ch.isTextBased?.() ? ch : null;
}

/** Post a moderation-action log (ban/kick/warn/etc.) whenever a channel is set. */
async function logModAction(guild, embed) {
  const ch = getLogChannel(guild);
  if (!ch) return;
  try {
    await ch.send({ embeds: [embed] });
  } catch {
    /* missing perms — ignore */
  }
}

/** Post a passive server-event log, gated by its moderation.logging.events toggle. */
async function logEvent(guild, eventKey, embed) {
  if (!mod().logging?.events?.[eventKey]) return;
  const ch = getLogChannel(guild);
  if (!ch) return;
  try {
    await ch.send({ embeds: [embed] });
  } catch {
    /* missing perms — ignore */
  }
}

module.exports = { getLogChannel, logModAction, logEvent };
