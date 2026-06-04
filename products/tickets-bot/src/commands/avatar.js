'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');

module.exports = {
  name: 'avatar',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a member\'s avatar.')
    .addUserOption((o) => o.setName('user').setDescription('Member (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const url = user.displayAvatarURL({ size: 1024 });
    return interaction.reply({ embeds: [info(`${user.username}'s avatar`).setImage(url)] });
  },
};
