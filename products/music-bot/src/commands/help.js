'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { music, cfg } = require('../lib/state');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the available commands.'),

  async execute(interaction) {
    const e = info('🎵 Resonance — Commands').addFields(
      { name: '▶️ Playback', value: '`/play` `/pause` `/resume` `/skip` `/stop`' },
      { name: 'ℹ️ Info', value: '`/queue` `/nowplaying`' },
      { name: '🎚️ Controls', value: `\`/volume\`${music().allowFilters ? ' `/filter`' : ''}` },
    );
    if (cfg('modules.playlists', false)) e.addFields({ name: '📚 Playlists', value: '`/playlist save | load | list | delete`' });
    if (cfg('modules.leveling', false)) e.addFields({ name: '⭐ Voice Leveling', value: '`/rank` `/levels` `/setxp` — earn XP in voice.' });
    if (cfg('modules.welcome', false)) e.addFields({ name: '👋 Welcome', value: 'Auto-roles + welcome/goodbye — configured in your dashboard.' });
    e.addFields({ name: '🔧 Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' });
    e.setFooter({ text: 'Configure every module in your Hynex dashboard.' });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
