'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { manager } = require('../lib/player');
const { ok, err, info } = require('../lib/embeds');

module.exports = {
  name: 'volume',
  djControl: true,
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Show or set the playback volume (0-200).')
    .addIntegerOption((o) => o.setName('percent').setDescription('0-200').setMinValue(0).setMaxValue(200)),

  async execute(interaction) {
    const player = manager.get(interaction.guild.id);
    if (!player) return interaction.reply({ embeds: [err('Nothing is playing.')], ephemeral: true });
    const pct = interaction.options.getInteger('percent');
    if (pct === null) return interaction.reply({ embeds: [info('🔊 Volume', `Currently **${player.volume}%**.`)] });
    const v = player.setVolume(pct);
    return interaction.reply({ embeds: [ok(`🔊 Volume set to **${v}%**.`)] });
  },
};
