'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { leaderboardEmbed } = require('../lib/economy');

module.exports = {
  name: 'leaderboard',
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('See the richest members.'),

  async execute(interaction) {
    return interaction.reply({ embeds: [leaderboardEmbed(interaction.guild)] });
  },
};
