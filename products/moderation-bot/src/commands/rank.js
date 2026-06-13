'use strict';

const { SlashCommandBuilder } = require('discord.js');
const store = require('../lib/store');
const { levelInfo } = require('../leveling');
const { make } = require('../lib/embeds');

function progressBar(into, need) {
  const pct = need ? Math.min(1, into / need) : 0;
  const filled = Math.round(pct * 12);
  return `${'▰'.repeat(filled)}${'▱'.repeat(12 - filled)} ${Math.round(pct * 100)}%`;
}

module.exports = {
  name: 'rank',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Show your (or someone's) level and XP.")
    .addUserOption((o) => o.setName('user').setDescription('Member')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const { xp } = store.getXp(interaction.guild.id, user.id);
    const info = levelInfo(xp);
    const rank = store.rankOf(interaction.guild.id, user.id);
    return interaction.reply({
      embeds: [
        make({
          title: `📊 Rank — ${user.username}`,
          description: `**Level ${info.level}** · Rank #${rank}\n${progressBar(info.into, info.need)}\n${info.into} / ${info.need} XP to next level · ${info.total} total`,
        }),
      ],
    });
  },
};
