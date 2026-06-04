'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { pay } = require('../lib/economy');

module.exports = {
  name: 'pay',
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send coins to another member.')
    .addUserOption((o) => o.setName('user').setDescription('Who to pay').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('How much').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const to = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const res = pay(interaction.guild, interaction.user, to, amount);
    return interaction.reply({ embeds: [res.embed], ephemeral: !res.ok });
  },
};
