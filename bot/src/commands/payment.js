const path = require('path');
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../config');
const { V2, text, media, sep, container } = require('../lib/components');

// Header image shipped with the bot (so it never expires like a CDN link).
const PAYMENT_IMAGE_PATH = path.join(__dirname, '..', '..', 'assets', 'payment.png');
const PAYMENT_IMAGE_NAME = 'payment.png';

/** The payment-methods panel (Components V2). */
function buildPaymentPanel(guildId) {
  const pp = config.paymentPanel || {};
  const methods = pp.methods || [];

  const children = [media(`attachment://${PAYMENT_IMAGE_NAME}`)];

  for (const m of methods) {
    children.push(sep());
    children.push(text(`### ${m.label}`));
    if (m.address) children.push(text('```\n' + m.address + '\n```'));
    if (m.note) children.push(text(`-# ${m.note}`));
  }

  // "Order Now" → jump to the ticket channel where customers open a ticket.
  if (pp.ticketChannelId && guildId) {
    children.push(sep());
    children.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Order Now')
          .setURL(`https://discord.com/channels/${guildId}/${pp.ticketChannelId}`),
      ),
    );
  }

  const file = new AttachmentBuilder(PAYMENT_IMAGE_PATH, { name: PAYMENT_IMAGE_NAME });
  return { flags: V2, components: [container(null, children)], files: [file] };
}

module.exports = {
  buildPaymentPanel,
  data: new SlashCommandBuilder()
    .setName('payment')
    .setDescription('Post the payment-methods panel in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    // Acknowledge first — uploading the banner can exceed the 3s window.
    await interaction.deferReply({ ephemeral: true });
    await interaction.channel.send(buildPaymentPanel(interaction.guildId));
    await interaction.editReply({ content: 'Payment panel posted.' });
  },
};
