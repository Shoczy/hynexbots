'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { cfg } = require('../lib/state');
const { panels, panelPayload } = require('../reactionroles');
const { ok, err, warn } = require('../lib/embeds');

module.exports = {
  name: 'roles-panel',
  requiredPerm: PermissionFlagsBits.ManageGuild,
  data: new SlashCommandBuilder()
    .setName('roles-panel')
    .setDescription('Post one of your configured self-role panels.')
    .addIntegerOption((o) =>
      o.setName('panel').setDescription('Which panel (1, 2, …) — defaults to the first').setMinValue(1),
    )
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Where to post (defaults to the panel’s channel, otherwise here)')
        .addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!cfg('modules.reactionroles', false)) {
      return interaction.reply({ embeds: [warn('The Reaction Roles module is off — enable it in the dashboard.')], ephemeral: true });
    }
    const list = panels();
    if (!list.length) {
      return interaction.reply({ embeds: [warn('No panels configured yet — add one in the dashboard.')], ephemeral: true });
    }

    const idx = (interaction.options.getInteger('panel') || 1) - 1;
    const panel = list[idx];
    if (!panel) {
      return interaction.reply({ embeds: [err(`There’s no panel #${idx + 1}. You have ${list.length}.`)], ephemeral: true });
    }
    if (!(panel.roles || []).length) {
      return interaction.reply({ embeds: [err('That panel has no roles yet.')], ephemeral: true });
    }

    const target =
      interaction.options.getChannel('channel') ||
      (panel.channelId && interaction.guild.channels.cache.get(panel.channelId)) ||
      interaction.channel;
    if (!target?.isTextBased?.()) {
      return interaction.reply({ embeds: [err('That channel can’t receive messages.')], ephemeral: true });
    }

    try {
      await target.send(panelPayload(panel));
    } catch {
      return interaction.reply({ embeds: [err(`I couldn’t post in ${target} — check my permissions.`)], ephemeral: true });
    }
    return interaction.reply({ embeds: [ok(`Panel posted in ${target}.`)], ephemeral: true });
  },
};
