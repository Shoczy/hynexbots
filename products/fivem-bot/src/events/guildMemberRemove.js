'use strict';

const { Events } = require('discord.js');
const { cfg } = require('../lib/state');
const { buildMessagePayload } = require('../lib/messages');

/** Welcome module: post the goodbye message on leave. */
module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      if (!cfg('modules.welcome', false)) return;
      const block = cfg('messages.leave', null);
      const payload = buildMessagePayload(block, member);
      if (payload && block.channelId) {
        const ch = member.guild.channels.cache.get(block.channelId);
        if (ch?.isTextBased?.()) await ch.send(payload).catch(() => {});
      }
    } catch (e) {
      console.error('guildMemberRemove handler error:', e);
    }
  },
};
