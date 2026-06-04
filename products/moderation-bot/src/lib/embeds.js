'use strict';

const { EmbedBuilder } = require('discord.js');
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

module.exports = { brandColor, base, make, info, ok, err, warn, COLORS };
