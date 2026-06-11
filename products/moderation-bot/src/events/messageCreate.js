'use strict';

const { Events } = require('discord.js');
const { handleMessage } = require('../automod');
const { trackMessage } = require('../autoslowmode');
const { handlePrefix } = require('../prefix');
const { handleAutoresponders } = require('../autoresponder');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      // Watch channel rate for auto-slowmode (non-blocking, counts every message).
      trackMessage(message).catch(() => {});
      // Auto-mod first — if it removed the message, don't run it as a command.
      const acted = await handleMessage(message);
      if (acted) return;
      // Prefix commands next; if it wasn't one, try the auto-responder.
      if (await handlePrefix(message)) return;
      await handleAutoresponders(message);
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
