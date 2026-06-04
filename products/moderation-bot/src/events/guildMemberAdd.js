'use strict';

const { Events } = require('discord.js');
const { handleMemberAdd } = require('../antiraid');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const acted = await handleMemberAdd(member);
      if (acted) return; // anti-raid removed them — skip the normal join log
      await logEvent(
        member.guild,
        'memberJoinLeave',
        info('📥 Member Joined', `${member.user.tag} (\`${member.id}\`)\nAccount created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`),
      );
    } catch (e) {
      console.error('guildMemberAdd handler error:', e);
    }
  },
};
