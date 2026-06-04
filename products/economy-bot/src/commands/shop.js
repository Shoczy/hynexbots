'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { shopEmbed, buy } = require('../lib/economy');

module.exports = {
  name: 'shop',
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the shop, or buy an item.')
    .addStringOption((o) => o.setName('buy').setDescription('Name of the item to buy')),

  async execute(interaction) {
    const item = interaction.options.getString('buy');
    if (!item) return interaction.reply({ embeds: [shopEmbed()] });
    const res = await buy(interaction.guild, interaction.member, item);
    return interaction.reply({ embeds: [res.embed], ephemeral: !res.ok });
  },
};
