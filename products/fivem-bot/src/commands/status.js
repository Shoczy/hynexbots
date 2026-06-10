'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { fivem } = require('../lib/state');
const { queryServer } = require('../lib/fivem');
const { statusEmbed } = require('../lib/render');

module.exports = {
  name: 'status',
  data: new SlashCommandBuilder().setName('status').setDescription('Show the live FiveM server status.'),

  async execute(interaction) {
    await interaction.deferReply();
    const snapshot = await queryServer(fivem().server.host);
    return interaction.editReply({ embeds: [statusEmbed(snapshot, fivem().server.name)] });
  },
};
