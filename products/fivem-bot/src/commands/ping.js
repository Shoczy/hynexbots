'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { info } = require('../lib/embeds');

module.exports = {
  name: 'ping',
  data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot\'s latency.'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging…', fetchReply: true, ephemeral: true });
    const rtt = sent.createdTimestamp - interaction.createdTimestamp;
    return interaction.editReply({
      content: null,
      embeds: [info('🏓 Pong', `**Round-trip:** ${rtt}ms\n**WebSocket:** ${Math.round(interaction.client.ws.ping)}ms`)],
    });
  },
};
