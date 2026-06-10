'use strict';

const {
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const { cfg } = require('./state');

/**
 * Shared visual identity. Every Hynex bot uses this so its output looks like one
 * cohesive, premium product: the customer's accent color, a consistent footer
 * and a timestamp on every embed, plus clean "card" layouts.
 */
const BRAND_FOOTER = 'Hynex Bots';
const COLORS = {
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xf5a623,
};

/** The customer's configured accent color as an int (defaults to indigo). */
function brandColor() {
  const hex = cfg('basics.embedColor', '#6366f1');
  const n = parseInt(String(hex).replace('#', ''), 16);
  return Number.isFinite(n) ? n : 0x6366f1;
}

/** Apply the shared footer + timestamp unless the caller set their own. */
function brandify(embed) {
  if (!embed.data.footer) embed.setFooter({ text: BRAND_FOOTER });
  if (!embed.data.timestamp) embed.setTimestamp();
  return embed;
}

/** A bare branded embed in the accent color — build on it freely. */
function base() {
  return brandify(new EmbedBuilder().setColor(brandColor()));
}

/** Flexible builder for richer "card" embeds. */
function make({ title, url, description, color, fields, thumbnail, image, author, footer } = {}) {
  const e = new EmbedBuilder().setColor(color ?? brandColor());
  if (title) e.setTitle(title);
  if (url) e.setURL(url);
  if (description) e.setDescription(description);
  if (fields?.length) e.addFields(fields.filter(Boolean));
  if (thumbnail) e.setThumbnail(thumbnail);
  if (image) e.setImage(image);
  if (author) e.setAuthor(author);
  if (footer) e.setFooter(footer);
  return brandify(e);
}

/** Neutral / informational embed in the brand accent. */
function info(title, description) {
  return make({ title, description });
}

/** Success embed (green). */
function ok(description, title) {
  return make({ title, description, color: COLORS.success });
}

/** Error embed (red). Kept titleless by default — the color carries the intent. */
function err(description, title) {
  return make({ title, description, color: COLORS.danger });
}

/** Warning embed (amber). */
function warn(description, title) {
  return make({ title, description, color: COLORS.warning });
}

/**
 * Build a Components V2 message payload — a single accent "container" holding an
 * ordered list of items. Used for everything posted to a channel (panels,
 * welcome messages, status board) so the bot's output uses Discord's modern
 * component system instead of legacy embeds.
 *
 * `items` entries:
 *   - string            → a text display (markdown; `##` heading, `-#` subtext)
 *   - { separator:true} → a divider
 *   - { image: url }    → a media gallery image
 *   - { row }           → an ActionRow (buttons)
 */
function v2(items = [], accent) {
  const container = new ContainerBuilder();
  const color = accent ?? brandColor();
  if (Number.isFinite(color)) container.setAccentColor(color);
  for (const it of items) {
    if (it == null || it === '') continue;
    if (typeof it === 'string') {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(it.slice(0, 4000)));
    } else if (it.separator) {
      container.addSeparatorComponents(new SeparatorBuilder());
    } else if (it.image) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(it.image)),
      );
    } else if (it.row) {
      container.addActionRowComponents(it.row);
    }
  }
  return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

module.exports = { brandColor, base, make, info, ok, err, warn, v2, COLORS };
