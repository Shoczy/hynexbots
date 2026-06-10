'use strict';

const { Events } = require('discord.js');
const { handleMessage } = require('../automod');
const { handlePrefix } = require('../prefix');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      // Auto-mod first — if it removed the message, don't run it as a command.
      const acted = await handleMessage(message);
      if (acted) return;
      await handlePrefix(message);
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
