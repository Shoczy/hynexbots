'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const store = require('../store');
const config = require('../config');
const { buildWelcome } = require('../events/guildMemberAdd');

const TEXTY = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the join welcome message.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('setup')
        .setDescription('Set the welcome channel (and optional ticket button) and turn it on.')
        .addChannelOption((o) => o.setName('channel').setDescription('Where welcome messages are posted').addChannelTypes(...TEXTY).setRequired(true))
        .addChannelOption((o) => o.setName('ticket').setDescription('Channel the "Open a Ticket" button links to (optional)').addChannelTypes(...TEXTY).setRequired(false)),
    )
    .addSubcommand((s) => s.setName('test').setDescription('Preview the welcome message here.'))
    .addSubcommand((s) => s.setName('off').setDescription('Turn the welcome message off.')),

  async execute(interaction) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'You need **Manage Server** to configure the welcome message.', flags: MessageFlags.Ephemeral });
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const ticket = interaction.options.getChannel('ticket');
      const patch = { enabled: true, channelId: channel.id };
      if (ticket) patch.ticketChannelId = ticket.id;
      store.setWelcome(patch);

      const w = store.getWelcome();
      const ticketId = w.ticketChannelId || config.welcome.ticketChannelId || config.paymentPanel.ticketChannelId;
      const lines = [
        '✅ Welcome messages are **on**.',
        `**Channel:** ${channel}`,
        `**Ticket button:** ${ticketId ? `<#${ticketId}>` : '_not set_'}`,
        'Preview it with `/welcome test`.',
      ];
      return interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
    }

    if (sub === 'off') {
      store.setWelcome({ enabled: false });
      return interaction.reply({ content: '🚫 Welcome messages are now **off**.', flags: MessageFlags.Ephemeral });
    }

    // test
    return interaction.reply(buildWelcome(interaction.member));
  },
};
