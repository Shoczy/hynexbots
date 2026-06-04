'use strict';

const { Events } = require('discord.js');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    await logEvent(
      ban.guild,
      'banKick',
      info('🔨 Member Banned', `**User:** ${ban.user.tag} (\`${ban.user.id}\`)${ban.reason ? `\n**Reason:** ${ban.reason}` : ''}`),
    );
  },
};
