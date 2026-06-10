'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { fivem } = require('../lib/state');
const { queryServer } = require('../lib/fivem');
const { playersEmbed } = require('../lib/render');

module.exports = {
  name: 'players',
  data: new SlashCommandBuilder().setName('players').setDescription('List the players currently on the FiveM server.'),

  async execute(interaction) {
    await interaction.deferReply();
    const snapshot = await queryServer(fivem().server.host);
    return interaction.editReply({ embeds: [playersEmbed(snapshot, fivem().server.name)] });
  },
};
