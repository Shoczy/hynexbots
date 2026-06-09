'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { cfg } = require('../lib/state');
const { entries, matchEntry, answerEmbed } = require('../faq');
const { info, warn } = require('../lib/embeds');

module.exports = {
  name: 'faq',
  data: new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Look up a frequently asked question.')
    .addStringOption((o) => o.setName('query').setDescription('What you’re looking for')),

  async execute(interaction) {
    if (!cfg('modules.faq', false)) {
      return interaction.reply({ embeds: [warn('The FAQ isn’t set up yet.')], ephemeral: true });
    }
    const list = entries();
    if (!list.length) {
      return interaction.reply({ embeds: [warn('No FAQ entries yet.')], ephemeral: true });
    }

    const query = interaction.options.getString('query');
    if (query) {
      const entry = matchEntry(query);
      if (!entry) {
        return interaction.reply({ embeds: [warn(`No FAQ entry matches “${query}”.`)], ephemeral: true });
      }
      return interaction.reply({ embeds: [answerEmbed(entry)] });
    }

    const lines = list.map((e) => `• ${e.keywords.slice(0, 3).join(', ')}`);
    return interaction.reply({
      embeds: [info('📚 FAQ topics').setDescription(`${lines.join('\n')}\n\nAsk with \`/faq query:<keyword>\`.`)],
      ephemeral: true,
    });
  },
};
