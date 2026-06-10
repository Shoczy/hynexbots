'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');

module.exports = {
  name: 'serverinfo',
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show information about this Discord server.'),

  async execute(interaction) {
    const g = interaction.guild;
    const e = info(g.name).addFields(
      { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
      { name: 'Members', value: String(g.memberCount), inline: true },
      { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
    );
    if (g.icon) e.setThumbnail(g.iconURL({ size: 256 }));
    return interaction.reply({ embeds: [e] });
  },
};
