'use strict';

const { Events } = require('discord.js');
const { cfg } = require('../lib/state');
const { buildMessagePayload } = require('../lib/messages');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!cfg('modules.welcome', false)) return;
    try {
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
