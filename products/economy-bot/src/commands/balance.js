'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { balanceEmbed } = require('../lib/economy');

module.exports = {
  name: 'balance',
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your (or someone\'s) balance.')
    .addUserOption((o) => o.setName('user').setDescription('Whose balance (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    return interaction.reply({ embeds: [balanceEmbed(interaction.guild, user)] });
  },
};
