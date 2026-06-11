'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { doUnmute } = require('../lib/actions');
const { err } = require('../lib/embeds');

module.exports = {
  name: 'unmute',
  requiredPerm: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a mute / timeout from a member.')
    .addUserOption((o) => o.setName('user').setDescription('Member to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ embeds: [err('That user isn\'t in this server.')], ephemeral: true });
    const res = await doUnmute(interaction.guild, member, { moderator: interaction.user });
    return interaction.reply({ ...(res.reply || { embeds: [res.embed] }), ephemeral: !res.ok });
  },
};
