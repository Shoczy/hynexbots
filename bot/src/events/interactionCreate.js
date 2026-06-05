const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const config = require('../config');
const tickets = require('../tickets/manager');
const { buildPurchaseModal, paymentLabel, MODAL_PREFIX } = require('../tickets/purchaseModal');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // ── Slash commands ──────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        return command.execute(interaction, client);
      }

      // ── Product select menu → ask for bot details via modal ──
      if (interaction.isStringSelectMenu() && interaction.customId === 'panel_select_product') {
        const product = config.catalog.find((p) => p.id === interaction.values[0]);
        if (!product) {
          return interaction.reply({ content: 'That product is no longer available.', ephemeral: true });
        }
        return interaction.showModal(buildPurchaseModal(product));
      }

      // ── Purchase modal submit → open the ticket with the details ──
      if (interaction.isModalSubmit() && interaction.customId.startsWith(MODAL_PREFIX)) {
        const productId = interaction.customId.slice(MODAL_PREFIX.length);
        const product = config.catalog.find((p) => p.id === productId);
        if (!product) {
          return interaction.reply({ content: 'That product is no longer available.', ephemeral: true });
        }
        const botName = interaction.fields.getTextInputValue('bot_name');
        const payment = interaction.fields.getStringSelectValues('payment')[0] || null;
        const files = interaction.fields.getUploadedFiles('avatar');
        const avatarUrl = files?.first?.()?.url || null;
        return tickets.createTicket(interaction, {
          type: 'purchase',
          product,
          botName,
          payment,
          paymentLabelText: payment ? paymentLabel(payment) : null,
          avatarUrl,
        });
      }

      // ── Custom commission button → open a modal ─────
      if (interaction.isButton() && interaction.customId === 'panel_custom') {
        const modal = new ModalBuilder()
          .setCustomId('custom_commission_modal')
          .setTitle('Custom Bot Commission');

        const brief = new TextInputBuilder()
          .setCustomId('brief')
          .setLabel('What should your bot do?')
          .setPlaceholder('Features, integrations, similar bots, anything important…')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000);

        const budget = new TextInputBuilder()
          .setCustomId('budget')
          .setLabel('Budget & deadline (optional)')
          .setPlaceholder('e.g. $150, needed within 2 weeks')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200);

        modal.addComponents(
          new ActionRowBuilder().addComponents(brief),
          new ActionRowBuilder().addComponents(budget),
        );
        return interaction.showModal(modal);
      }

      // ── Modal submit → open custom ticket ───────────
      if (interaction.isModalSubmit() && interaction.customId === 'custom_commission_modal') {
        const brief = interaction.fields.getTextInputValue('brief');
        const budget = interaction.fields.getTextInputValue('budget');
        const details = budget ? `${brief}\n\n**Budget/Deadline:** ${budget}` : brief;
        return tickets.createTicket(interaction, { type: 'custom', details });
      }

      // ── In-ticket controls ──────────────────────────
      if (interaction.isButton() && interaction.customId === 'ticket_claim') {
        return tickets.claimTicket(interaction);
      }
      if (interaction.isButton() && interaction.customId === 'ticket_close') {
        return tickets.closeTicket(interaction);
      }
    } catch (err) {
      console.error('Interaction error:', err);
      const msg = { content: '⚠ Something went wrong handling that interaction.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        interaction.followUp(msg).catch(() => {});
      } else {
        interaction.reply(msg).catch(() => {});
      }
    }
  },
};
