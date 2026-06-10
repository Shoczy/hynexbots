'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { fivem } = require('../lib/state');
const { make, err, ok, COLORS } = require('../lib/embeds');

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
      return interaction.reply({ embeds: [err('No announcement channel is set. Pick one in your dashboard → FiveM → Restart announcements.')], ephemeral: true });
    }
    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased?.()) {
      return interaction.reply({ embeds: [err('The configured announcement channel is unavailable.')], ephemeral: true });
    }

    const name = fivem().server.name || 'The server';
    const minutes = interaction.options.getInteger('minutes');
    const text = minutes
      ? `**${name}** restarts in **${minutes} minute${minutes === 1 ? '' : 's'}**.`
      : `**${name}** is restarting now. You may briefly lose connection.`;
    const embed = make({ title: '🔄 Server restart', description: text, color: minutes ? COLORS.warning : COLORS.danger });

    await channel.send({ content: rs.pingRoleId ? `<@&${rs.pingRoleId}>` : undefined, embeds: [embed] }).catch(() => {});
    return interaction.reply({ embeds: [ok('Restart announcement posted.')], ephemeral: true });
  },
};
