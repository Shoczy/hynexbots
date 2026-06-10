'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { cfg } = require('../lib/state');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the FiveM bot commands.'),

  async execute(interaction) {
    const prefix = cfg('basics.prefix', '!');
    const fields = [
      { name: '🎮 Server', value: '`/status` — live server status\n`/players` — who\'s online' },
    ];
    if (cfg('fivem.whitelist.enabled', false)) {
      fields.push({ name: '🎫 Whitelist', value: '`/whitelist add` `/whitelist remove` `/whitelist list`' });
    }
    if (cfg('fivem.restarts.enabled', false)) {
      fields.push({ name: '🔄 Restarts', value: '`/restart` — announce a restart now or in N minutes' });
    }
    fields.push(
      { name: '🔧 Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' },
      { name: 'Prefix commands', value: `Text commands also work with your prefix, e.g. \`${prefix}status\`, \`${prefix}players\`.` },
    );
    const e = info('🎮 FiveM Bot — Commands')
      .addFields(fields)
      .setFooter({ text: 'Configure everything in your Hynex dashboard.' });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
