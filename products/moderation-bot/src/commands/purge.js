'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { doPurge } = require('../lib/actions');
const { ok, err } = require('../lib/embeds');

module.exports = {
  name: 'purge',
  requiredPerm: PermissionFlagsBits.ManageMessages,
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages (up to 100, under 14 days old).')
    .addIntegerOption((o) =>
      o.setName('amount').setDescription('How many to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this member'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const res = await doPurge(interaction.channel, amount, { filterUserId: user?.id });
    if (!res.ok) return interaction.editReply({ embeds: [err('Failed to purge — messages may be older than 14 days.')] });
    return interaction.editReply({ embeds: [ok(`🧹 Deleted **${res.count}** message(s).`)] });
  },
};
