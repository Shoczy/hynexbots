const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const config = require('../config');
const tickets = require('../tickets/manager');
const { buildPurchaseModal, paymentLabel, MODAL_PREFIX } = require('../tickets/purchaseModal');
const fleet = require('../commands/fleet');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // ── Slash commands ──────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        return await command.execute(interaction, client);
      }

      // ── Fleet panel: node dropdown + page buttons ──
      // deferUpdate + editReply (without re-passing the V2 flag) so we can
      // re-render the existing V2 panel and re-upload its banner without the 3s
      // interaction window biting on the image upload.
      if (interaction.isStringSelectMenu() && interaction.customId === fleet.NODE_SELECT_ID) {
        await interaction.deferUpdate();
        const view = fleet.buildFleetView({ nodeId: interaction.values[0], page: 0 });
        return interaction.editReply({ components: view.components, files: view.files });
      }
      if (interaction.isButton() && interaction.customId.startsWith(fleet.PAGE_PREFIX)) {
        const rest = interaction.customId.slice(fleet.PAGE_PREFIX.length); // <nodeId>:<page>
        const cut = rest.lastIndexOf(':');
        const nodeId = rest.slice(0, cut);
        const page = parseInt(rest.slice(cut + 1), 10) || 0;
        await interaction.deferUpdate();
        const view = fleet.buildFleetView({ nodeId, page });
        return interaction.editReply({ components: view.components, files: view.files });
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
      // Staff order-status dropdown (replaces the old per-status buttons).
      if (interaction.isStringSelectMenu() && interaction.customId === 'order_status_select') {
        return tickets.setOrderStatus(interaction, interaction.values[0]);
      }
      // Backward-compat: old purchase tickets still carry status buttons.
      if (interaction.isButton() && interaction.customId.startsWith('order_status:')) {
        const status = interaction.customId.slice('order_status:'.length);
        return tickets.setOrderStatus(interaction, status);
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
