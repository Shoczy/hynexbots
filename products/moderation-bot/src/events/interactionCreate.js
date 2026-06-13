'use strict';

const { Events, MessageFlags } = require('discord.js');
const { authorize, DENY_MESSAGE } = require('../lib/perms');
const { err } = require('../lib/embeds');
const { VERIFY_BUTTON_ID, handleVerifyButton } = require('../verification');
const appeal = require('../appeal');
const reactionroles = require('../reactionroles');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Button interactions (verification gate + ban appeals) — before commands.
    if (interaction.isButton()) {
      try {
        if (interaction.customId === VERIFY_BUTTON_ID) await handleVerifyButton(interaction);
        else if (interaction.customId.startsWith(reactionroles.RR_PREFIX)) await reactionroles.handleButton(interaction);
        else if (interaction.customId.startsWith(appeal.APPEAL_PREFIX)) await appeal.handleAppealButton(interaction);
        else if (interaction.customId.startsWith(appeal.DECISION_PREFIX)) await appeal.handleAppealDecision(interaction);
      } catch (e) {
        console.error('button handler failed:', e);
      }
      return;
    }

    // Ban-appeal modal (submitted from the user's DMs).
    if (interaction.isModalSubmit()) {
      try {
        if (interaction.customId.startsWith(appeal.MODAL_PREFIX)) await appeal.handleAppealModal(interaction);
      } catch (e) {
        console.error('modal handler failed:', e);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (!interaction.inGuild()) {
      return interaction.reply({ embeds: [err('This bot only works inside a server.')], flags: MessageFlags.Ephemeral });
    }

    const auth = authorize(command, interaction.member);
    if (!auth.ok) {
      return interaction.reply({ embeds: [err(DENY_MESSAGE[auth.reason] || 'Not allowed.')], flags: MessageFlags.Ephemeral });
    }

    client.cfg?.recordCommand(interaction.commandName);

    try {
      await command.execute(interaction);
    } catch (e) {
      console.error(`Command /${interaction.commandName} failed:`, e);
      const payload = { embeds: [err('Something went wrong running that command.')], flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  },
};
