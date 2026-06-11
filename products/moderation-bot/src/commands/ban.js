'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { doBan } = require('../lib/actions');
const { err } = require('../lib/embeds');

module.exports = {
  name: 'ban',
  requiredPerm: PermissionFlagsBits.BanMembers,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .addUserOption((o) => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the ban'))
    .addIntegerOption((o) =>
      o.setName('delete_days').setDescription('Delete this many days of their messages (0-7)').setMinValue(0).setMaxValue(7),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;
    if (user.id === interaction.user.id) {
      return interaction.reply({ embeds: [err('You can\'t ban yourself.')], flags: MessageFlags.Ephemeral });
    }
    const res = await doBan(interaction.guild, user, { moderator: interaction.user, reason, deleteDays });
    return interaction.reply(res.ok ? (res.reply || { embeds: [res.embed] }) : { embeds: [res.embed], flags: MessageFlags.Ephemeral });
  },
};
