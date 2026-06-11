'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { fivem } = require('../lib/state');
const store = require('../lib/store');
const { make, err } = require('../lib/embeds');

function human(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

module.exports = {
  name: 'playtime',
  data: new SlashCommandBuilder()
    .setName('playtime')
    .setDescription("Show a player's total time on the FiveM server.")
    .addStringOption((o) => o.setName('player').setDescription('In-game player name').setRequired(true)),

  async execute(interaction) {
    if (!fivem().playtime?.enabled) {
      return interaction.reply({ embeds: [err('Playtime tracking is turned off.')], flags: MessageFlags.Ephemeral });
    }
    const name = interaction.options.getString('player');
    const row = store.findPlaytime(name);
    if (!row) {
      return interaction.reply({ embeds: [make({ title: '⏱️ Playtime', description: `No tracked playtime for **${name}** yet.` })] });
    }
    return interaction.reply({
      embeds: [make({ title: `⏱️ Playtime — ${row.name}`, description: `Total time on the server: **${human(row.seconds)}**` })],
    });
  },
};
