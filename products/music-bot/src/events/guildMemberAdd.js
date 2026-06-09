'use strict';

const { Events } = require('discord.js');
const { cfg } = require('../lib/state');
const { buildMessagePayload } = require('../lib/messages');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (!cfg('modules.welcome', false)) return;
    try {
      for (const id of cfg('messages.autoRoleIds', []) || []) {
        await member.roles.add(id, 'Auto-role on join').catch(() => {});
      }
      const block = cfg('messages.welcome', null);
      const payload = buildMessagePayload(block, member);
      if (payload && block.channelId) {
        const ch = member.guild.channels.cache.get(block.channelId);
        if (ch?.isTextBased?.()) await ch.send(payload).catch(() => {});
      }
    } catch (e) {
      console.error('guildMemberAdd handler error:', e);
    }
  },
};
