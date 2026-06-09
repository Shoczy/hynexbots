const path = require('path');
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../config');
const { V2, text, media, sep, container } = require('../lib/components');
const { parseEmoji } = require('../lib/emoji');

// Header image is shipped with the bot and uploaded as an attachment, so it
// never expires the way a Discord CDN link would.
const PANEL_IMAGE_PATH = path.join(__dirname, '..', '..', 'assets', 'panel.png');
const PANEL_IMAGE_NAME = 'panel.png';

/** The storefront panel customers interact with to open a ticket. */
function buildPanel() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('panel_select_product')
    .setPlaceholder('Browse ready-made bots')
    .addOptions(
      config.catalog.map((p) => ({
        label: `${p.label} — ${p.price}`,
        value: p.id,
        description: p.description.slice(0, 100),
        emoji: parseEmoji(p.emoji),
      })),
    );

  const customBtn = new ButtonBuilder()
    .setCustomId('panel_custom')
    .setLabel('Request a custom bot')
    .setStyle(ButtonStyle.Secondary);

  const catalogLines = config.catalog
    .map((p) => `${p.emoji}  **${p.label}** · \`${p.price}\` — ${p.description}`)
    .join('\n');

  const panel = container(config.brand.color, [
    media(`attachment://${PANEL_IMAGE_NAME}`),
    text(`## ${config.brand.name}\n${config.brand.tagline}`),
    sep(),
    text(catalogLines),
    sep(),
    text('Select a bot below or request a custom build — we open a private ticket for setup, delivery & payment.'),
    new ActionRowBuilder().addComponents(menu),
    new ActionRowBuilder().addComponents(customBtn),
  ]);

  const file = new AttachmentBuilder(PANEL_IMAGE_PATH, { name: PANEL_IMAGE_NAME });
  return { flags: V2, components: [panel], files: [file] };
}

module.exports = {
  buildPanel,
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post the Hynex Bots storefront / ticket panel in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.channel.send(buildPanel());
    await interaction.reply({ content: 'Storefront panel posted.', ephemeral: true });
  },
};
