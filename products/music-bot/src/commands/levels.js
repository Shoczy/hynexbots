'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const lv = require('../lib/leveling');

module.exports = {
  name: 'levels',
  data: new SlashCommandBuilder().setName('levels').setDescription('Show the server XP leaderboard.'),

  async execute(interaction) {
    const rows = lv.top(interaction.guild.id, 10);
    if (!rows.length) {
      return interaction.reply({ embeds: [info('🏆 XP Leaderboard', 'No one has earned XP yet.')], ephemeral: true });
    }
    const lines = rows.map((r, i) => `**${i + 1}.** <@${r.user_id}> — level ${lv.levelFromXp(r.xp).level} (${r.xp} XP)`);
    return interaction.reply({ embeds: [info('🏆 XP Leaderboard').setDescription(lines.join('\n'))] });
  },
};
