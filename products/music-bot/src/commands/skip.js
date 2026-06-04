'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { manager } = require('../lib/player');
const { ok, err } = require('../lib/embeds');

module.exports = {
  name: 'skip',
  djControl: true,
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current song.'),

  async execute(interaction) {
    const player = manager.get(interaction.guild.id);
    if (!player || !player.current) return interaction.reply({ embeds: [err('Nothing is playing.')], ephemeral: true });
    const title = player.current.title;
    player.skip();
    return interaction.reply({ embeds: [ok(`⏭️ Skipped **${title}**.`)] });
  },
};
