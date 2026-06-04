'use strict';

const { Events } = require('discord.js');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    await logEvent(
      member.guild,
      'memberJoinLeave',
      info('📤 Member Left', `${member.user?.tag || member.id} (\`${member.id}\`)`),
    );
  },
};
