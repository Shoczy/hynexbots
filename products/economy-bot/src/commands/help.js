'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { eco } = require('../lib/state');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the economy commands.'),

  async execute(interaction) {
    const e = info('💰 Economy Commands').addFields(
      { name: 'Earn', value: '`/daily` `/work`' },
      { name: 'Wallet', value: '`/balance` `/pay` `/leaderboard`' },
      { name: 'Shop', value: '`/shop` — browse · `/shop buy:<item>` — purchase' },
    );
    if (eco().gambling) e.addFields({ name: 'Gambling', value: '`/coinflip` `/slots`' });
    e.addFields({ name: 'Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' }).setFooter({
      text: 'Currency, rewards, the shop & gambling are configured in your Hynex dashboard.',
    });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
