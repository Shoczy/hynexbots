'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { closeTicket, ctxFromInteraction } = require('../lib/manager');

module.exports = {
  name: 'close',
  data: new SlashCommandBuilder().setName('close').setDescription('Close the current ticket (staff or owner).'),

  async execute(interaction) {
    return closeTicket(ctxFromInteraction(interaction));
  },
};
