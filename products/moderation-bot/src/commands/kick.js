'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { doKick } = require('../lib/actions');
const { err } = require('../lib/embeds');

module.exports = {
  name: 'kick',
  requiredPerm: PermissionFlagsBits.KickMembers,
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption((o) => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!member) return interaction.reply({ embeds: [err('That user isn\'t in this server.')], ephemeral: true });
    if (member.id === interaction.user.id) {
      return interaction.reply({ embeds: [err('You can\'t kick yourself.')], ephemeral: true });
    }
    const res = await doKick(interaction.guild, member, { moderator: interaction.user, reason });
    return interaction.reply({ ...(res.reply || { embeds: [res.embed] }), ephemeral: !res.ok });
  },
};
