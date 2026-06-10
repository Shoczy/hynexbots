'use strict';

const { Events } = require('discord.js');
const { cfg } = require('../lib/state');
const { handlePrefix } = require('../prefix');

/** Auto-responder: reply when a message matches a configured trigger. */
async function handleAutoresponses(message) {
  const list = cfg('messages.autoresponses', []) || [];
  if (!list.length) return false;
  const content = message.content.toLowerCase();
  for (const ar of list) {
    if (!ar || ar.enabled === false || !ar.trigger || !ar.reply) continue;
    const t = String(ar.trigger).toLowerCase();
    const hit =
      ar.match === 'exact' ? content === t
      : ar.match === 'startsWith' ? content.startsWith(t)
      : ar.match === 'endsWith' ? content.endsWith(t)
      : content.includes(t);
    if (hit) {
      await message.channel.send({ content: String(ar.reply).slice(0, 2000) }).catch(() => {});
      return true;
    }
  }
  return false;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      // Prefix commands first; if it wasn't one, try the auto-responder.
      const handled = await handlePrefix(message);
      if (!handled) await handleAutoresponses(message);
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
