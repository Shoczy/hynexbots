'use strict';

const { Events } = require('discord.js');
const { authorize, DENY_MESSAGE } = require('../lib/perms');
const { err } = require('../lib/embeds');
const manager = require('../lib/manager');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.inGuild()) {
      if (interaction.isRepliable()) {
        await interaction.reply({ embeds: [err('This bot only works inside a server.')], ephemeral: true }).catch(() => {});
      }
      return;
    }

    // ── Panel button / topic select ──
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const ctx = manager.ctxFromInteraction(interaction);
      try {
        if (interaction.customId === manager.ID.OPEN) return manager.openTicket(ctx);
        if (interaction.customId === manager.ID.TOPIC) return manager.openTicket(ctx, interaction.values?.[0]);
        if (interaction.customId === manager.ID.CLOSE) return manager.closeTicket(ctx);
        if (interaction.customId === manager.ID.CLAIM) return manager.claim(ctx);
      } catch (e) {
        console.error('ticket component error:', e);
      }
      return;
    }

    // ── Slash commands ──
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const auth = authorize(command, interaction.member);
    if (!auth.ok) {
      return interaction.reply({ embeds: [err(DENY_MESSAGE[auth.reason] || 'Not allowed.')], ephemeral: true });
    }

    client.cfg?.recordCommand(interaction.commandName);

    try {
      await command.execute(interaction);
    } catch (e) {
      console.error(`Command /${interaction.commandName} failed:`, e);
      const payload = { embeds: [err('Something went wrong running that command.')], ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  },
};
