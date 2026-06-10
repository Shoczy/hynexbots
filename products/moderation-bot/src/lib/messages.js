'use strict';

const { brandColor, v2 } = require('./embeds');

/**
 * Substitute the dashboard's message variables with live member/guild data.
 * Mirrors the tokens shown in the dashboard's Messages editor.
 */
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
 * Build a sendable Components V2 payload from a welcome/leave message block,
 * with variables resolved. The plain text and the embed body live in one accent
 * container (separated by a divider). Returns null when disabled or empty.
 */
function buildMessagePayload(block, member) {
  if (!block || !block.enabled) return null;
  const text = block.text ? applyVars(block.text, member) : '';
  const e = block.embed;
  const items = [];
  if (text) items.push(text);
  if (e?.enabled) {
    const hasEmbedBody = e.title || e.description || e.image || e.footer;
    if (text && hasEmbedBody) items.push({ separator: true });
    if (e.title) items.push(`## ${applyVars(e.title, member)}`);
    if (e.description) items.push(applyVars(e.description, member));
    if (e.image) items.push({ image: e.image });
    if (e.footer) items.push(`-# ${applyVars(e.footer, member)}`);
  }
  if (!items.length) return null;
  return v2(items, e?.enabled ? hexToInt(e.color) : brandColor());
}

module.exports = { applyVars, buildMessagePayload };
