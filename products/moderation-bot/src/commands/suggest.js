'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { cfg } = require('../lib/state');
const { err } = require('../lib/embeds');
const suggestions = require('../suggestions');

module.exports = {
  name: 'suggest',
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion for the server.')
    .addStringOption((o) => o.setName('text').setDescription('Your suggestion').setMaxLength(1500).setRequired(true)),

  async execute(interaction) {
    if (!cfg('modules.suggestions', false)) {
      return interaction.reply({ embeds: [err('Suggestions are disabled for this server.')], flags: MessageFlags.Ephemeral });
    }
    const text = interaction.options.getString('text').trim();
    if (!text) return interaction.reply({ embeds: [err('Your suggestion can\'t be empty.')], flags: MessageFlags.Ephemeral });
    await suggestions.submit(interaction, text);
  },
};
