'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { doWarn } = require('../lib/actions');
const { err } = require('../lib/embeds');

module.exports = {
  name: 'warn',
  requiredPerm: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (auto-escalates per your dashboard rules).')
    .addUserOption((o) => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the warning'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!member) return interaction.reply({ embeds: [err('That user isn\'t in this server.')], flags: MessageFlags.Ephemeral });
    if (member.user.bot) return interaction.reply({ embeds: [err('You can\'t warn a bot.')], flags: MessageFlags.Ephemeral });
    const res = await doWarn(interaction.guild, member, { moderator: interaction.user, reason });
    return interaction.reply(res.reply || { embeds: [res.embed] });
  },
};
