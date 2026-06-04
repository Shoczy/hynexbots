'use strict';

const { Events } = require('discord.js');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild || message.author?.bot) return;
    const content = message.content ? message.content.slice(0, 1024) : '*(no cached content)*';
    await logEvent(
      message.guild,
      'messageDelete',
      info('🗑️ Message Deleted', `**Author:** ${message.author?.tag || 'unknown'}\n**Channel:** <#${message.channel.id}>\n**Content:** ${content}`),
    );
  },
};
