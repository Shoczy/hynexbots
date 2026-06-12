'use strict';

const { Events, MessageFlags } = require('discord.js');
const { authorize, DENY_MESSAGE } = require('../lib/perms');
const { err } = require('../lib/embeds');
const application = require('../fivem/application');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Whitelist application: panel button, modal submission, staff decision.
    try {
      if (interaction.isButton()) {
        if (interaction.customId === application.APPLY_BUTTON_ID) return application.handleApplyButton(interaction);
        if (interaction.customId.startsWith(application.DECISION_PREFIX)) return application.handleDecision(interaction);
        return;
      }
      if (interaction.isModalSubmit()) {
        if (interaction.customId === application.MODAL_ID) return application.handleModal(interaction);
        return;
      }
    } catch (e) {
      console.error('interaction component handler failed:', e);
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
