'use strict';

const { Events } = require('discord.js');
const { handlePrefix } = require('../prefix');
const { handleAutoresponders } = require('../autoresponder');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      // Prefix commands first; if it wasn't one, try the auto-responder.
      const handled = await handlePrefix(message);
      if (!handled) await handleAutoresponders(message);
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
