'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { cfg } = require('../lib/state');
const { panelPayload } = require('../verification');
const { ok, err, warn } = require('../lib/embeds');

module.exports = {
  name: 'verify-panel',
  requiredPerm: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('verify-panel')
    .setDescription('Post the verification panel members click to gain access.')
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Where to post (defaults to the configured channel, otherwise here)')
        .addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!cfg('modules.verification', false)) {
      return interaction.reply({
        embeds: [warn('The Verification module is turned off — enable it in the dashboard first.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const configuredId = cfg('verification.channelId', '');
    const target =
      interaction.options.getChannel('channel') ||
      (configuredId && interaction.guild.channels.cache.get(configuredId)) ||
      interaction.channel;

    if (!target?.isTextBased?.()) {
      return interaction.reply({ embeds: [err('That channel can’t receive messages.')], flags: MessageFlags.Ephemeral });
    }

    try {
      await target.send(panelPayload());
    } catch {
      return interaction.reply({
        embeds: [err(`I couldn’t post in ${target} — check my permissions there.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({ embeds: [ok(`Verification panel posted in ${target}.`)], flags: MessageFlags.Ephemeral });
  },
};
