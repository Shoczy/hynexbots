'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { coinflip } = require('../lib/economy');

module.exports = {
  name: 'coinflip',
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Bet coins on a coin flip (if gambling is enabled).')
    .addIntegerOption((o) => o.setName('amount').setDescription('How much to bet').setRequired(true).setMinValue(1))
    .addStringOption((o) =>
      o.setName('side').setDescription('Call it').addChoices({ name: 'heads', value: 'heads' }, { name: 'tails', value: 'tails' }),
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const side = interaction.options.getString('side');
    const res = coinflip(interaction.guild, interaction.user, amount, side);
    return interaction.reply({ embeds: [res.embed], ephemeral: !res.ok });
  },
};
