'use strict';

const { Events } = require('discord.js');
const { authorize, DENY_MESSAGE } = require('../lib/perms');
const { err } = require('../lib/embeds');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (!interaction.inGuild()) {
      return interaction.reply({ embeds: [err('This bot only works inside a server.')], ephemeral: true });
    }

    const auth = authorize(command, interaction.member);
    if (!auth.ok) {
      return interaction.reply({ embeds: [err(DENY_MESSAGE[auth.reason] || 'Not allowed.')], ephemeral: true });
    }

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
