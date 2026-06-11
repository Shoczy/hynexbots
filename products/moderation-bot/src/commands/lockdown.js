'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { doLockdown } = require('../lib/actions');

module.exports = {
  name: 'lockdown',
  requiredPerm: PermissionFlagsBits.ManageChannels,
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock or unlock the current channel for @everyone.')
    .addBooleanOption((o) => o.setName('unlock').setDescription('Unlock instead of lock'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const unlock = interaction.options.getBoolean('unlock');
    const res = await doLockdown(interaction.channel, { lock: !unlock, moderator: interaction.user });
    return interaction.reply({ embeds: [res.embed], flags: res.ok ? undefined : MessageFlags.Ephemeral });
  },
};
