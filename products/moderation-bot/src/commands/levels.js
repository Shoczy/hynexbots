'use strict';

const { SlashCommandBuilder } = require('discord.js');
const store = require('../lib/store');
const { levelInfo } = require('../leveling');
const { make } = require('../lib/embeds');

module.exports = {
  name: 'levels',
  data: new SlashCommandBuilder().setName('levels').setDescription('Show the XP leaderboard.'),

  async execute(interaction) {
    const top = store.topLevels(interaction.guild.id, 10);
    if (!top.length) {
      return interaction.reply({ embeds: [make({ title: '📊 XP leaderboard', description: 'No XP earned yet — start chatting!' })] });
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((r, i) => `${medals[i] || `**${i + 1}.**`} <@${r.user_id}> — Level ${levelInfo(r.xp).level} (${r.xp} XP)`).join('\n');
    return interaction.reply({ embeds: [make({ title: '📊 XP leaderboard', description: lines })], allowedMentions: { parse: [] } });
  },
};
