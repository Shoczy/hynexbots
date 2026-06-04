'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { manager } = require('../lib/player');
const { ok, err } = require('../lib/embeds');

module.exports = {
  name: 'stop',
  djControl: true,
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback, clear the queue and leave.'),

  async execute(interaction) {
    const player = manager.get(interaction.guild.id);
    if (!player) return interaction.reply({ embeds: [err('Nothing is playing.')], ephemeral: true });
    player.stop();
    player.destroy();
    return interaction.reply({ embeds: [ok('⏹️ Stopped and left the channel.')] });
  },
};
