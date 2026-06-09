'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { eco, cfg } = require('../lib/state');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the available commands.'),

  async execute(interaction) {
    const e = info('🪙 Vault — Commands').addFields(
      { name: '💰 Earn', value: '`/daily` `/work`' },
      { name: '👛 Wallet', value: '`/balance` `/pay` `/leaderboard`' },
      { name: '🛒 Shop', value: '`/shop` — browse · `/shop buy:<item>` — purchase' },
    );
    if (eco().gambling) e.addFields({ name: '🎲 Gambling', value: '`/coinflip` `/slots`' });
    if (cfg('modules.leveling', false)) e.addFields({ name: '⭐ Leveling', value: '`/rank` `/levels` `/setxp`' });
    if (cfg('modules.giveaways', false)) e.addFields({ name: '🎉 Giveaways', value: '`/giveaway start | end | reroll | list`' });
    if (cfg('modules.welcome', false)) e.addFields({ name: '👋 Welcome', value: 'Auto-roles + welcome/goodbye — configured in your dashboard.' });
    e.addFields({ name: '🔧 Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' }).setFooter({
      text: 'Configure every module in your Hynex dashboard.',
    });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
