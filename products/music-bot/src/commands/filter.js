'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { manager, FILTER_NAMES } = require('../lib/player');
const { ok, err } = require('../lib/embeds');
const { music } = require('../lib/state');

module.exports = {
  name: 'filter',
  djControl: true,
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Apply an audio filter (takes effect on the next song).')
    .addStringOption((o) =>
      o
        .setName('name')
        .setDescription('Which filter')
        .setRequired(true)
        .addChoices(...FILTER_NAMES.map((n) => ({ name: n, value: n }))),
    ),

  async execute(interaction) {
    if (!music().allowFilters) return interaction.reply({ embeds: [err('Audio filters are disabled on this server.')], ephemeral: true });
    const player = manager.get(interaction.guild.id);
    if (!player) return interaction.reply({ embeds: [err('Nothing is playing.')], ephemeral: true });
    const name = interaction.options.getString('name');
    player.setFilter(name);
    return interaction.reply({ embeds: [ok(`🎛️ Filter set to **${name}**. It applies to the next song (use \`/skip\` to apply now).`)] });
  },
};
