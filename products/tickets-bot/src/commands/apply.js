'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { cfg } = require('../lib/state');
const { forms, buildModal } = require('../applications');
const { warn, err, info } = require('../lib/embeds');

module.exports = {
  name: 'apply',
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Open an application form.')
    .addIntegerOption((o) => o.setName('form').setDescription('Which form (1, 2, …) when several exist').setMinValue(1)),

  async execute(interaction) {
    if (!cfg('modules.applications', false)) {
      return interaction.reply({ embeds: [warn('Applications are currently closed.')], ephemeral: true });
    }
    const list = forms();
    if (!list.length) {
      return interaction.reply({ embeds: [warn('No application forms are set up yet.')], ephemeral: true });
    }

    const chosen = interaction.options.getInteger('form');
    if (!chosen && list.length > 1) {
      const lines = list.map((f, i) => `**${i + 1}.** ${f.name}${f.description ? ` — ${f.description}` : ''}`);
      return interaction.reply({
        embeds: [info('Pick a form', `${lines.join('\n')}\n\nRun \`/apply form:<number>\` to start.`)],
        ephemeral: true,
      });
    }

    const form = list[(chosen || 1) - 1];
    if (!form) {
      return interaction.reply({ embeds: [err(`There’s no form #${chosen}. You have ${list.length}.`)], ephemeral: true });
    }
    return interaction.showModal(buildModal(form));
  },
};
