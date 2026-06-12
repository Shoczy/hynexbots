'use strict';

const { Events } = require('discord.js');
const { handleMessage } = require('../automod');
const { trackMessage } = require('../autoslowmode');
const { handlePrefix } = require('../prefix');
const { handleAutoresponders } = require('../autoresponder');
const modmail = require('../modmail');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;

    // DMs → modmail (member to staff).
    if (!message.guild) {
      try {
        await modmail.handleDM(message, client || message.client);
      } catch (e) {
        console.error('modmail DM handler failed:', e);
      }
      return;
    }

    // Staff replies inside a modmail thread → relay to the member.
    if (modmail.isModmailThread(message.channel)) {
      try {
        await modmail.handleThreadReply(message);
      } catch (e) {
        console.error('modmail thread handler failed:', e);
      }
      return;
    }

    try {
      // Watch channel rate for auto-slowmode (non-blocking, counts every message).
      trackMessage(message).catch(() => {});
      // Auto-mod first — if it removed the message, don't run it as a command.
      const acted = await handleMessage(message);
      if (acted) return;
      // Prefix commands next; if it wasn't one, try the auto-responder.
      if (await handlePrefix(message)) return;
      await handleAutoresponders(message);
    } catch (e) {
      console.error('messageCreate handler error:', e);
    }
  },
};
