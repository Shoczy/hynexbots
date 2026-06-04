'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildPanel } = require('../lib/manager');
const { ok } = require('../lib/embeds');

module.exports = {
  name: 'ticket-panel',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post the ticket panel in this channel (admin only).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.channel.send(buildPanel(interaction.guild));
    return interaction.reply({ embeds: [ok('Ticket panel posted.')], ephemeral: true });
  },
};
