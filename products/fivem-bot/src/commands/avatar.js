'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');

module.exports = {
  name: 'avatar',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a member\'s avatar.')
    .addUserOption((o) => o.setName('user').setDescription('The member (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    return interaction.reply({ embeds: [info(`${user.username}'s avatar`).setImage(user.displayAvatarURL({ size: 1024 }))] });
  },
};
