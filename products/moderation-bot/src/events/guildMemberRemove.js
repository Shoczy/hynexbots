'use strict';

const { Events } = require('discord.js');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');
const { cfg } = require('../lib/state');
const { buildMessagePayload } = require('../lib/messages');
const antinuke = require('../antinuke');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    // Anti-nuke: a leave may be a kick — let it check the audit log.
    antinuke.onGuildMemberRemove(member).catch((e) => console.error('antinuke kick check failed:', e));

    // Welcome module: post the goodbye message on leave.
    if (cfg('modules.welcome', false)) {
      const block = cfg('messages.leave', null);
      const payload = buildMessagePayload(block, member);
      if (payload && block.channelId) {
        const ch = member.guild.channels.cache.get(block.channelId);
        if (ch?.isTextBased?.()) {
          await ch.send(payload).catch(() => {});
        }
      }
    }

    await logEvent(
      member.guild,
      'memberJoinLeave',
      info('📤 Member Left', `${member.user?.tag || member.id} (\`${member.id}\`)`),
    );
  },
};
