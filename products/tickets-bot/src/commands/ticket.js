'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { openTicket, ctxFromInteraction } = require('../lib/manager');

module.exports = {
  name: 'ticket',
  data: new SlashCommandBuilder().setName('ticket').setDescription('Open a support ticket.'),

  async execute(interaction) {
    return openTicket(ctxFromInteraction(interaction));
  },
};
