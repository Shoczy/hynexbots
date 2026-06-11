'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { doMute } = require('../lib/actions');
const { err } = require('../lib/embeds');
const { parseDuration } = require('./_helpers');

module.exports = {
  name: 'mute',
  requiredPerm: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member (uses the configured mute role, or a timeout).')
    .addUserOption((o) => o.setName('user').setDescription('Member to mute').setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription('e.g. 10m, 1h, 2d (blank = default)'))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the mute'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const durationMs = parseDuration(interaction.options.getString('duration'));
    if (!member) return interaction.reply({ embeds: [err('That user isn\'t in this server.')], flags: MessageFlags.Ephemeral });
    if (member.id === interaction.user.id) {
      return interaction.reply({ embeds: [err('You can\'t mute yourself.')], flags: MessageFlags.Ephemeral });
    }
    const res = await doMute(interaction.guild, member, { moderator: interaction.user, reason, durationMs });
    return interaction.reply(res.ok ? (res.reply || { embeds: [res.embed] }) : { embeds: [res.embed], flags: MessageFlags.Ephemeral });
  },
};
