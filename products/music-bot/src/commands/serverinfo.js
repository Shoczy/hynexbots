'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');

module.exports = {
  name: 'serverinfo',
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show information about this server.'),

  async execute(interaction) {
    const g = interaction.guild;
    const e = info(g.name)
      .setThumbnail(g.iconURL({ size: 256 }) || null)
      .addFields(
        { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
        { name: 'Members', value: String(g.memberCount), inline: true },
        { name: 'Channels', value: String(g.channels.cache.size), inline: true },
        { name: 'Roles', value: String(g.roles.cache.size), inline: true },
        { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Boosts', value: String(g.premiumSubscriptionCount || 0), inline: true },
      )
      .setFooter({ text: `ID: ${g.id}` });
    return interaction.reply({ embeds: [e] });
  },
};
