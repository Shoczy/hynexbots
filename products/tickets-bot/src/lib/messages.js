'use strict';

const { EmbedBuilder } = require('discord.js');
const { brandColor } = require('./embeds');

/** Substitute the dashboard's message variables with live member/guild data. */
function applyVars(text, member) {
  if (!text) return text;
  const g = member.guild;
  return String(text)
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user?.username || 'member')
    .replaceAll('{memberName}', member.displayName || member.user?.username || 'member')
    .replaceAll('{server}', g?.name || 'the server')
    .replaceAll('{memberCount}', String(g?.memberCount ?? ''));
}

function hexToInt(hex) {
  const n = parseInt(String(hex || '').replace('#', ''), 16);
  return Number.isFinite(n) ? n : brandColor();
}

/**
 * Build a sendable { content, embeds } payload from a welcome/leave message block,
 * with variables resolved. Returns null when the block is disabled or empty.
 */
function buildMessagePayload(block, member) {
  if (!block || !block.enabled) return null;
  const content = block.text ? applyVars(block.text, member) : '';

  let embed = null;
  const e = block.embed;
  if (e?.enabled) {
    embed = new EmbedBuilder().setColor(hexToInt(e.color));
    if (e.title) embed.setTitle(applyVars(e.title, member));
    if (e.description) embed.setDescription(applyVars(e.description, member));
    if (e.image) embed.setImage(e.image);
    if (e.footer) embed.setFooter({ text: applyVars(e.footer, member) });
  }

  if (!content && !embed) return null;
  return { content: content || undefined, embeds: embed ? [embed] : [] };
}

module.exports = { applyVars, buildMessagePayload };
