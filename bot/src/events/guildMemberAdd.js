'use strict';

const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder } = require('discord.js');
const config = require('../config');
const store = require('../store');
const { V2, text, sep } = require('../lib/components');

/** The channel the "Ticket öffnen" button links to (live config → env → payment panel). */
function ticketChannelId() {
  const w = store.getWelcome();
  return w.ticketChannelId || config.welcome.ticketChannelId || config.paymentPanel.ticketChannelId || null;
}

/**
 * Build the welcome message payload (Components V2) for a member. Reused by the
 * join event and by `/welcome test`. Uses a coloured accent bar (unlike the
 * shop's neutral containers) to make the greeting pop.
 */
function buildWelcome(member) {
  const box = new ContainerBuilder().setAccentColor(config.brand.color);

  box.addTextDisplayComponents(text(`## 👋 Willkommen auf ${member.guild.name}, ${member}!`));
  box.addTextDisplayComponents(
    text(
      `Schön, dass du da bist! **${config.brand.name}** ist dein Shop für premium, fertige Discord-Bots.\n\n` +
        '🛒 Stöber durch unser Sortiment und **öffne ein Ticket**, um zu bestellen, Fragen zu stellen oder einen individuellen Bot anzufragen. Unser Team antwortet schnell.',
    ),
  );

  const ticketId = ticketChannelId();
  if (ticketId) {
    box.addSeparatorComponents(sep());
    box.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Ticket öffnen')
          .setEmoji('🎫')
          .setURL(`https://discord.com/channels/${member.guild.id}/${ticketId}`),
      ),
    );
  }

  box.addSeparatorComponents(sep());
  box.addTextDisplayComponents(text(`-# Du bist Mitglied **#${member.guild.memberCount}** • willkommen an Bord!`));

  return { flags: V2, components: [box], allowedMentions: { users: [member.id] } };
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
