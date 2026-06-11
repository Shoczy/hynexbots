'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { fivem } = require('../lib/state');
const { err, ok } = require('../lib/embeds');
const restartScheduler = require('../fivem/restartScheduler');

module.exports = {
  name: 'restart',
  requiredPerm: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Announce a server restart now or in a few minutes.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((o) =>
      o.setName('minutes').setDescription('Announce a restart in this many minutes (omit = now)').setMinValue(1).setMaxValue(120),
    ),

  async execute(interaction) {
    const rs = fivem().restarts;
    const channelId = rs.channelId;
    if (!channelId) {
      return interaction.reply({ embeds: [err('No announcement channel is set. Pick one in your dashboard → FiveM → Restart announcements.')], flags: MessageFlags.Ephemeral });
    }
    await restartScheduler.manualAnnounce(interaction.options.getInteger('minutes') || 0);
    return interaction.reply({ embeds: [ok('Restart announcement posted.')], flags: MessageFlags.Ephemeral });
  },
};
