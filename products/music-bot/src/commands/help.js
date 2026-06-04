'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');
const { music } = require('../lib/state');

module.exports = {
  name: 'help',
  data: new SlashCommandBuilder().setName('help').setDescription('List the music commands.'),

  async execute(interaction) {
    const e = info('🎵 Music Commands').addFields(
      { name: 'Playback', value: '`/play` `/pause` `/resume` `/skip` `/stop`' },
      { name: 'Info', value: '`/queue` `/nowplaying`' },
      { name: 'Controls', value: `\`/volume\`${music().allowFilters ? ' `/filter`' : ''}` },
      { name: 'Utility', value: '`/help` `/ping` `/serverinfo` `/userinfo` `/avatar`' },
    );
    if (music().djOnly) e.setFooter({ text: 'DJ-only mode is on — playback controls are limited to DJ roles.' });
    else e.setFooter({ text: 'DJ roles, volume, filters & auto-leave are configured in your Hynex dashboard.' });
    return interaction.reply({ embeds: [e], ephemeral: true });
  },
};
