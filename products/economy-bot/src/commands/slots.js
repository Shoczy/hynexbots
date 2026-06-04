'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { slots } = require('../lib/economy');

module.exports = {
  name: 'slots',
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Spin the slot machine (if gambling is enabled).')
    .addIntegerOption((o) => o.setName('amount').setDescription('How much to bet').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const res = slots(interaction.guild, interaction.user, amount);
    return interaction.reply({ embeds: [res.embed], ephemeral: !res.ok });
  },
};
