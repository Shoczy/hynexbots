'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { cfg } = require('../lib/state');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the moderation commands.'),

  async execute(interaction) {
    const prefix = cfg('basics.prefix', '!');
    const e = info('🛡️ Moderation Commands')
      .addFields(
        {
          name: 'Moderation',
          value:
            '`/ban` `/kick` `/mute` `/unmute` `/warn` `/warnings` `/purge` `/lockdown`',
        },
        { name: 'Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' },
        {
          name: 'Prefix commands',
          value: `Text commands also work with your prefix: \`${prefix}ban @user\`, \`${prefix}warn @user reason\`, etc.`,
        },
      )
      .setFooter({ text: 'Configure auto-mod, anti-raid, warnings & logging in your Hynex dashboard.' });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
