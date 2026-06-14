'use strict';

const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const store = require('../store');
const { V2, text, sep, container } = require('../lib/components');

/** The channel the "Open a Ticket" button links to (live config → env → payment panel). */
function ticketChannelId() {
  const w = store.getWelcome();
  return w.ticketChannelId || config.welcome.ticketChannelId || config.paymentPanel.ticketChannelId || null;
}

/**
 * Build the welcome message payload (Components V2) for a member. Reused by the
 * join event and by `/welcome test`.
 */
function buildWelcome(member) {
  const lineup = config.catalog.map((c) => `${c.webEmoji} **${c.label}** · ${c.price}`).join('\n');

  const children = [
    text(`## 👋 Welcome to ${member.guild.name}`),
    text(
      `Hey ${member}, great to have you here. **${config.brand.name}** is your shop for premium, ready-made Discord bots — set up and delivered fast.`,
    ),
    sep(),
    text(`**Our lineup**\n${lineup}`),
  ];

  const ticketId = ticketChannelId();
  if (ticketId) {
    children.push(text('Ready to order or got a question? **Open a ticket** and our team replies fast.'));
    children.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Open a Ticket')
          .setEmoji('🎫')
          .setURL(`https://discord.com/channels/${member.guild.id}/${ticketId}`),
      ),
    );
  }

  children.push(sep());
  children.push(text(`-# Member #${member.guild.memberCount} • ${config.brand.tagline}`));

  return { flags: V2, components: [container(config.brand.color, children)], allowedMentions: { users: [member.id] } };
}

module.exports = {
  name: Events.GuildMemberAdd,
  buildWelcome,
  async execute(member) {
    try {
      if (member.user?.bot) return;
      if (config.guildId && member.guild.id !== config.guildId) return;

      const w = store.getWelcome();
      if (!w.enabled) return; // off until configured with /welcome channel

      const channel = w.channelId
        ? await member.guild.channels.fetch(w.channelId).catch(() => null)
        : member.guild.systemChannel;
      if (!channel || !channel.isTextBased?.()) return;

      await channel.send(buildWelcome(member)).catch(() => {});
    } catch (e) {
      console.error('guildMemberAdd (welcome) failed:', e);
    }
  },
};
