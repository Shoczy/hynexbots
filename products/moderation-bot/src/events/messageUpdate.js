'use strict';

const { Events } = require('discord.js');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // embed/attachment-only edit
    const before = oldMessage.content ? oldMessage.content.slice(0, 512) : '*(no cached content)*';
    const after = newMessage.content ? newMessage.content.slice(0, 512) : '';
    await logEvent(
      newMessage.guild,
      'messageEdit',
      info('✏️ Message Edited', `**Author:** ${newMessage.author?.tag}\n**Channel:** <#${newMessage.channel.id}>\n**Before:** ${before}\n**After:** ${after}`),
    );
  },
};
