'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { mod } = require('../lib/state');
const { brandColor } = require('../lib/embeds');
const store = require('../lib/store');

function emojiMatches(reaction, want) {
  const e = reaction.emoji;
  return e.name === want || e.id === want || e.toString() === want;
}

function header(emoji, count, message) {
  return `${emoji} **${count}** · <#${message.channel.id}>`;
}

function buildEmbed(message, count) {
  const embed = new EmbedBuilder()
    .setColor(brandColor())
    .setAuthor({ name: message.author?.tag || 'Unknown', iconURL: message.author?.displayAvatarURL?.() })
    .setFooter({ text: `${count} ⭐` })
    .setTimestamp(message.createdAt);
  if (message.content) embed.setDescription(message.content.slice(0, 4000));
  const image = [...(message.attachments?.values?.() || [])].find((a) => (a.contentType || '').startsWith('image/'));
  if (image) embed.setImage(image.url);
  return embed;
}

const jumpRow = (message) =>
  new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Jump to message').setURL(message.url));

/** Recompute a message's star entry when its reactions change. */
async function handleReaction(reaction, user, client) {
  try {
    if (user?.bot) return;
    const sb = mod().starboard;
    if (!sb?.enabled || !sb.channelId) return;

    if (reaction.partial) await reaction.fetch().catch(() => null);
    const message = reaction.message;
    if (!message) return;
    if (message.partial) await message.fetch().catch(() => null);
    if (!message.guild || message.channel.id === sb.channelId) return; // never star the starboard itself

    const want = sb.emoji || '⭐';
    if (!emojiMatches(reaction, want)) return;

    const threshold = Math.max(1, sb.threshold || 3);
    const count = reaction.count || 0;
    const sbChannel = await client.channels.fetch(sb.channelId).catch(() => null);
    if (!sbChannel || !sbChannel.isTextBased?.()) return;

    const existing = store.getStar(message.id);

    if (count >= threshold) {
      const payload = { content: header(want, count, message), embeds: [buildEmbed(message, count)], components: [jumpRow(message)] };
      if (existing) {
        const edited = await sbChannel.messages.edit(existing.star_message_id, payload).catch(() => null);
        if (edited) store.setStar(message.id, existing.star_message_id, count);
        else {
          const sent = await sbChannel.send(payload).catch(() => null);
          if (sent) store.setStar(message.id, sent.id, count);
        }
      } else {
        const sent = await sbChannel.send(payload).catch(() => null);
        if (sent) store.setStar(message.id, sent.id, count);
      }
    } else if (existing) {
      await sbChannel.messages.delete(existing.star_message_id).catch(() => {});
      store.deleteStar(message.id);
    }
  } catch (e) {
    console.error('starboard error:', e);
  }
}

module.exports = { handleReaction };
