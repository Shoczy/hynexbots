'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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
    if (!member) return interaction.reply({ embeds: [err('That user isn\'t in this server.')], flags: MessageFlags.Ephemeral });
    const res = await doUnmute(interaction.guild, member, { moderator: interaction.user });
    return interaction.reply(res.ok ? (res.reply || { embeds: [res.embed] }) : { embeds: [res.embed], flags: MessageFlags.Ephemeral });
  },
};
