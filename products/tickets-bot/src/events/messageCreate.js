'use strict';

const { Events } = require('discord.js');
const { handlePrefix } = require('../prefix');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      await handlePrefix(message);
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
