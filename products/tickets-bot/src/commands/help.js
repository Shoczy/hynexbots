'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the ticket commands.'),

  async execute(interaction) {
    const e = info('🎫 Ticket Commands')
      .addFields(
        { name: 'For everyone', value: '`/ticket` — open a support ticket' },
        { name: 'In a ticket (staff/owner)', value: '`/close` `/add` `/remove`' },
        { name: 'Admin', value: '`/ticket-panel` — post the ticket panel' },
        { name: 'Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' },
      )
      .setFooter({ text: 'Configure staff roles, categories, transcripts & the panel in your Hynex dashboard.' });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
