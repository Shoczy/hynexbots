'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');

module.exports = {
  name: 'userinfo',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a member.')
    .addUserOption((o) => o.setName('user').setDescription('The member (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const e = info(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      );
    if (member?.joinedTimestamp) e.addFields({ name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });
    return interaction.reply({ embeds: [e] });
  },
};
