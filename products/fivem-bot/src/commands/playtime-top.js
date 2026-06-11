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
  name: 'playtime-top',
  data: new SlashCommandBuilder().setName('playtime-top').setDescription('Top players by time on the FiveM server.'),

  async execute(interaction) {
    if (!fivem().playtime?.enabled) {
      return interaction.reply({ embeds: [err('Playtime tracking is turned off.')], flags: MessageFlags.Ephemeral });
    }
    const top = store.topPlaytime(10);
    if (!top.length) {
      return interaction.reply({
        embeds: [make({ title: '⏱️ Playtime leaderboard', description: 'No playtime tracked yet — check back once players have been on.' })],
      });
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((r, i) => `${medals[i] || `**${i + 1}.**`} ${r.name || 'Unknown'} — ${human(r.seconds)}`).join('\n');
    return interaction.reply({ embeds: [make({ title: '⏱️ Playtime leaderboard', description: lines })] });
  },
};
