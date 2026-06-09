'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { cfg } = require('../lib/state');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the support commands.'),

  async execute(interaction) {
    const fields = [
      { name: '🎫 Tickets', value: '`/ticket` — open a ticket · staff: `/close` `/add` `/remove` · admin: `/ticket-panel`' },
    ];
    if (cfg('modules.applications', false)) {
      fields.push({ name: '📨 Applications', value: '`/apply` — fill out an application form. Staff approve/deny in the review channel.' });
    }
    if (cfg('modules.faq', false)) {
      fields.push({ name: '💡 FAQ', value: '`/faq` — look up an answer. Common questions are also auto-answered.' });
    }
    if (cfg('modules.welcome', false)) {
      fields.push({ name: '👋 Welcome', value: 'Auto-roles and welcome/goodbye messages — configured in your dashboard.' });
    }
    fields.push({ name: '🔧 Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' });

    const e = info('🎟️ Concierge — Commands')
      .addFields(fields)
      .setFooter({ text: 'Configure every module in your Hynex dashboard.' });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
