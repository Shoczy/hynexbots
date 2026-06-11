'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { info } = require('../lib/embeds');
const { listWarnings } = require('../lib/actions');

module.exports = {
  name: 'userinfo',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a member.')
    .addUserOption((o) => o.setName('user').setDescription('Member to look up (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    const warns = listWarnings(interaction.guild, user.id).length;
    const e = info(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      );
    if (member) {
      e.addFields(
        { name: 'Joined', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '—', inline: true },
        { name: 'Roles', value: String(member.roles.cache.size - 1), inline: true },
        { name: 'Active warnings', value: String(warns), inline: true },
      );
    }
    return interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  },
};
