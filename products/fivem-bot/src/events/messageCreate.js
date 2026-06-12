'use strict';

const { Events } = require('discord.js');
const { handlePrefix } = require('../prefix');
const { handleAutoresponders } = require('../autoresponder');
const chatBridge = require('../fivem/chatBridge');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      // Relay messages in the bridge channel to the in-game poller.
      if (chatBridge.enabled() && message.channel.id === chatBridge.channelId()) {
        const content = (message.cleanContent || message.content || '').trim();
        if (content) chatBridge.pushFromDiscord(message.member?.displayName || message.author.username, content);
      }
      // Prefix commands first; if it wasn't one, try the auto-responder.
      const handled = await handlePrefix(message);
      if (!handled) await handleAutoresponders(message);
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
