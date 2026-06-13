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
        .setName('channel')
        .setDescription('Choose the channel where the welcome message is posted (turns it on).')
        .addChannelOption((o) => o.setName('channel').setDescription('Welcome channel').addChannelTypes(...TEXTY).setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('ticket')
        .setDescription('Choose the channel the "Open a Ticket" button links to.')
        .addChannelOption((o) => o.setName('channel').setDescription('Ticket / storefront channel').addChannelTypes(...TEXTY).setRequired(true)),
    )
    .addSubcommand((s) => s.setName('test').setDescription('Preview the welcome message here.'))
    .addSubcommand((s) => s.setName('off').setDescription('Turn the welcome message off.'))
    .addSubcommand((s) => s.setName('status').setDescription('Show the current welcome settings.')),

  async execute(interaction) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'You need **Manage Server** to configure the welcome message.', flags: MessageFlags.Ephemeral });
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      store.setWelcome({ enabled: true, channelId: channel.id });
      return interaction.reply({ content: `✅ Welcome messages are **on** and will post in ${channel}. Use \`/welcome test\` to preview.`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'ticket') {
      const channel = interaction.options.getChannel('channel');
      store.setWelcome({ ticketChannelId: channel.id });
      return interaction.reply({ content: `✅ The "Open a Ticket" button now links to ${channel}.`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'off') {
      store.setWelcome({ enabled: false });
      return interaction.reply({ content: '🚫 Welcome messages are now **off**.', flags: MessageFlags.Ephemeral });
    }

    if (sub === 'test') {
      return interaction.reply(buildWelcome(interaction.member));
    }

    // status
    const w = store.getWelcome();
    const ticketId = w.ticketChannelId || config.welcome.ticketChannelId || config.paymentPanel.ticketChannelId;
    const lines = [
      `**Status:** ${w.enabled ? '🟢 On' : '🔴 Off'}`,
      `**Channel:** ${w.channelId ? `<#${w.channelId}>` : '_not set (system channel)_'}`,
      `**Ticket button:** ${ticketId ? `<#${ticketId}>` : '_not set_'}`,
    ];
    return interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
  },
};
