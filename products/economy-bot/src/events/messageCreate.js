'use strict';

const { Events } = require('discord.js');
const { handlePrefix } = require('../prefix');
const leveling = require('../leveling');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      await handlePrefix(message);
      await leveling.handleMessage(message); // award XP (cooldown enforced inside)
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
