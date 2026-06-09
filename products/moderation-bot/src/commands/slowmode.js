'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ok, err } = require('../lib/embeds');

module.exports = {
  name: 'slowmode',
  requiredPerm: PermissionFlagsBits.ManageChannels,
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set this channel’s slowmode (seconds between messages).')
    .addIntegerOption((o) =>
      o.setName('seconds').setDescription('0–21600 (0 turns it off)').setRequired(true).setMinValue(0).setMaxValue(21600),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    try {
      await interaction.channel.setRateLimitPerUser(seconds, `Slowmode by ${interaction.user.tag}`);
    } catch {
      return interaction.reply({
        embeds: [err('I couldn’t change slowmode here — check my Manage Channels permission.')],
        ephemeral: true,
      });
    }
    const msg = seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to **${seconds}s** per message.`;
    return interaction.reply({ embeds: [ok(msg)] });
  },
};
