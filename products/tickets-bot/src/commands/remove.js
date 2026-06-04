'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { removeUser } = require('../lib/manager');

module.exports = {
  name: 'remove',
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a member from the current ticket.')
    .addUserOption((o) => o.setName('user').setDescription('Member to remove').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const res = await removeUser(interaction.channel, user);
    return interaction.reply({ embeds: [res.embed], ephemeral: !res.ok });
  },
};
