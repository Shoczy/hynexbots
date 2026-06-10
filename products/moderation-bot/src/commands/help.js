'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { cfg } = require('../lib/state');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the moderation commands.'),

  async execute(interaction) {
    const prefix = cfg('basics.prefix', '!');
    const fields = [
      {
        name: '🛡️ Moderation',
        value: '`/ban` `/kick` `/mute` `/unmute` `/warn` `/warnings` `/purge` `/lockdown` `/slowmode`',
      },
    ];

    if (cfg('modules.verification', false)) {
      fields.push({ name: '✅ Verification', value: '`/verify-panel` — post the verify button members click to gain access.' });
    }
    if (cfg('modules.antinuke', false)) {
      fields.push({ name: '🛡️ Anti-Nuke', value: 'Auto-stops mass bans/deletes by rogue admins. Configure limits in your dashboard.' });
    }
    if (cfg('modules.welcome', false)) {
      fields.push({ name: '👋 Welcome', value: 'Auto-roles and welcome/goodbye messages — set them up in your dashboard.' });
    }

    fields.push(
      { name: '🔧 Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' },
      {
        name: 'Prefix commands',
        value: `Text commands also work with your prefix: \`${prefix}ban @user\`, \`${prefix}warn @user reason\`, etc.`,
      },
    );

    const e = info('🛡️ Server Guardian — Commands')
      .addFields(fields)
      .setFooter({ text: 'Configure every module in your Hynex dashboard.' });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
