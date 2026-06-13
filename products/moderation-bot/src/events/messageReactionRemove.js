'use strict';

const { Events } = require('discord.js');
const { handleReaction } = require('../starboard');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user, client) {
    await handleReaction(reaction, user, client);
  },
};
