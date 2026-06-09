'use strict';

const { Events } = require('discord.js');
const { logEvent } = require('../lib/log');
const { info } = require('../lib/embeds');
const antinuke = require('../antinuke');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    antinuke.onGuildBanAdd(ban).catch((e) => console.error('antinuke ban check failed:', e));
    await logEvent(
      ban.guild,
      'banKick',
      info('🔨 Member Banned', `**User:** ${ban.user.tag} (\`${ban.user.id}\`)${ban.reason ? `\n**Reason:** ${ban.reason}` : ''}`),
    );
  },
};
