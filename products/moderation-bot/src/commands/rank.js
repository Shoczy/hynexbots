'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const lv = require('../lib/leveling');

module.exports = {
  name: 'rank',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your level and XP.')
    .addUserOption((o) => o.setName('user').setDescription('Member to look up (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const row = lv.getRow(interaction.guild.id, user.id);
    const { level, into, need } = lv.levelFromXp(row.xp);
    const { position, total } = lv.rank(interaction.guild.id, user.id);

    const e = info(`${user.username}’s rank`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Level', value: String(level), inline: true },
        { name: 'XP', value: `${into} / ${need}`, inline: true },
        { name: 'Rank', value: position ? `#${position} of ${total}` : '—', inline: true },
      );
    return interaction.reply({ embeds: [e] });
  },
};
