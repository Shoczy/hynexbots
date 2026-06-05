const {
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  FileUploadBuilder,
} = require('discord.js');
const config = require('../config');

const MODAL_PREFIX = 'purchase_modal:';

/**
 * Build the purchase modal a customer fills in after picking a ready-made bot.
 * Uses modern modal components (discord.js v14.26+): a text input for the bot
 * name, a dropdown for the payment method, and a file upload for the avatar.
 * @param {{ id: string, label: string, price: string }} product
 */
function buildPurchaseModal(product) {
  const name = new LabelBuilder()
    .setLabel('Bot name')
    .setDescription('What should your bot be called?')
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId('bot_name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. Aether')
        .setRequired(true)
        .setMaxLength(80),
    );

  const payment = new LabelBuilder()
    .setLabel('Payment method')
    .setDescription('How would you like to pay?')
    .setStringSelectMenuComponent(
      new StringSelectMenuBuilder()
        .setCustomId('payment')
        .setPlaceholder('Choose a payment method')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          config.payments.map((p) => ({ label: p.label, value: p.value, emoji: p.emoji })),
        ),
    );

  const avatar = new LabelBuilder()
    .setLabel('Profile picture (optional)')
    .setDescription('Upload an avatar for your bot — PNG or JPG.')
    .setFileUploadComponent(
      new FileUploadBuilder()
        .setCustomId('avatar')
        .setMinValues(0)
        .setMaxValues(1)
        .setRequired(false),
    );

  return new ModalBuilder()
    .setCustomId(`${MODAL_PREFIX}${product.id}`)
    .setTitle(`Order — ${product.label}`.slice(0, 45))
    .addLabelComponents(name, payment, avatar);
}

/** Human-readable label for a stored payment value. */
function paymentLabel(value) {
  return config.payments.find((p) => p.value === value)?.label || value;
}

module.exports = { buildPurchaseModal, paymentLabel, MODAL_PREFIX };
