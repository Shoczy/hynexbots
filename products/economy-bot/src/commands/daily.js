'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { claimDaily } = require('../lib/economy');

module.exports = {
  name: 'daily',
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward.'),

  async execute(interaction) {
    const res = claimDaily(interaction.guild, interaction.user);
    return interaction.reply({ embeds: [res.embed], ephemeral: !res.ok });
  },
};
