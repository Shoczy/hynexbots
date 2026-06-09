'use strict';

const { Events } = require('discord.js');
const { handlePrefix } = require('../prefix');
const faq = require('../faq');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      await handlePrefix(message);
      await faq.handleMessage(message); // auto-answer common questions
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
