'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { addUser } = require('../lib/manager');

module.exports = {
  name: 'add',
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a member to the current ticket.')
    .addUserOption((o) => o.setName('user').setDescription('Member to add').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const res = await addUser(interaction.channel, user);
    return interaction.reply({ embeds: [res.embed], ephemeral: !res.ok });
  },
};
