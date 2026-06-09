'use strict';

const { Events } = require('discord.js');
const antinuke = require('../antinuke');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    if (!channel.guild) return;
    try {
      await antinuke.onChannelDelete(channel);
    } catch (e) {
      console.error('channelDelete handler error:', e);
    }
  },
};
