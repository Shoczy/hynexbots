'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { doWork } = require('../lib/economy');

module.exports = {
  name: 'work',
  data: new SlashCommandBuilder().setName('work').setDescription('Work for some coins.'),

  async execute(interaction) {
    const res = doWork(interaction.guild, interaction.user);
    return interaction.reply({ embeds: [res.embed], ephemeral: !res.ok });
  },
};
