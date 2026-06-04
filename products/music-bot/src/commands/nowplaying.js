'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { manager, nowPlayingCard } = require('../lib/player');
const { err } = require('../lib/embeds');

module.exports = {
  name: 'nowplaying',
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Show the current song.'),

  async execute(interaction) {
    const player = manager.get(interaction.guild.id);
    if (!player || !player.current) return interaction.reply({ embeds: [err('Nothing is playing.')], ephemeral: true });
    return interaction.reply({ embeds: [nowPlayingCard(player.current, player)] });
  },
};
