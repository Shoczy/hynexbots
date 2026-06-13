'use strict';

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const store = require('../lib/store');
const { cfg } = require('../lib/state');
const { levelInfo } = require('../leveling');
const { renderRankCard } = require('../leveling/card');
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

    // Image rank card (default) — falls back to the embed if disabled or canvas
    // isn't available on this host.
    if (cfg('leveling.rankCard', true) !== false) {
      const png = await renderRankCard({
        username: user.username,
        avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
        level: info.level,
        rank,
        into: info.into,
        need: info.need,
        totalXp: info.total,
        accent: cfg('basics.embedColor', '#6366f1'),
      });
      if (png) {
        return interaction.reply({ files: [new AttachmentBuilder(png, { name: 'rank.png' })] });
      }
    }

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
