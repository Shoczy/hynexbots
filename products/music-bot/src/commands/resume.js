'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { manager } = require('../lib/player');
const { ok, err } = require('../lib/embeds');

module.exports = {
  name: 'resume',
  djControl: true,
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume playback.'),

  async execute(interaction) {
    const player = manager.get(interaction.guild.id);
    if (!player || !player.current) return interaction.reply({ embeds: [err('Nothing is playing.')], ephemeral: true });
    player.resume();
    return interaction.reply({ embeds: [ok('▶️ Resumed.')] });
  },
};
