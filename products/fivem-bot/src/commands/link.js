'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const store = require('../lib/store');
const { ok, err } = require('../lib/embeds');

module.exports = {
  name: 'link',
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your in-game identifier to your Discord (for queue priority).')
    .addStringOption((o) => o.setName('identifier').setDescription('e.g. license:abc123 or steam:1100001...').setRequired(true)),

  async execute(interaction) {
    const identifier = interaction.options.getString('identifier').trim();
    if (!/^[a-z0-9]+:[a-z0-9]+$/i.test(identifier)) {
      return interaction.reply({ embeds: [err('That doesn’t look like an identifier — expected something like `license:abc123`.')], flags: MessageFlags.Ephemeral });
    }
    store.setLink(interaction.user.id, identifier);
    return interaction.reply({ embeds: [ok(`Linked \`${identifier}\` to your account. Your server roles now count for queue priority.`)], flags: MessageFlags.Ephemeral });
  },
};
