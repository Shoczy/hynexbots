'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { v2, brandColor } = require('./embeds');

/** Replace {name} tokens with live values; unknown tokens are left as-is. */
function subst(str, vars) {
  return String(str || '').replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : `{${k}}`,
  );
}

function hexToInt(hex) {
  const n = parseInt(String(hex || '').replace('#', ''), 16);
  return Number.isFinite(n) ? n : null;
}

/**
 * Turn a block document's blocks into the ordered item list the `v2()` helper
 * consumes (string text / { separator } / { image } / { row }), with variables
 * substituted. Link buttons need a label and an http(s) URL or they're dropped.
 */
function blocksToItems(blocks, vars = {}) {
  const items = [];
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b || typeof b !== 'object') continue;
    if (b.type === 'separator') {
      items.push({ separator: true });
    } else if (b.type === 'image') {
      if (b.url) items.push({ image: b.url });
    } else if (b.type === 'buttons') {
      const row = new ActionRowBuilder();
      for (const btn of Array.isArray(b.buttons) ? b.buttons : []) {
        const url = subst(btn.url, vars);
        if (!btn.label || !/^https?:\/\//i.test(url)) continue;
        const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(subst(btn.label, vars).slice(0, 80)).setURL(url);
        if (btn.emoji) {
          try {
            button.setEmoji(btn.emoji);
          } catch {
            /* ignore an emoji Discord won't accept */
          }
        }
        row.addComponents(button);
        if (row.components.length >= 5) break;
      }
      if (row.components.length) items.push({ row });
    } else if (b.type === 'text') {
      if (b.content) items.push(subst(b.content, vars));
    }
  }
  return items;
}

/**
 * Build a sendable Components V2 payload from a block-builder message, or null
 * when the message is disabled or renders to nothing. `extraItems` are appended
 * after the customer's blocks (e.g. a system button row).
 */
function renderBlocks(msg, vars = {}, extraItems = []) {
  if (!msg || !msg.enabled) return null;
  const items = [...blocksToItems(msg.blocks, vars), ...extraItems];
  if (!items.length) return null;
  const accent = hexToInt(msg.accent);
  return v2(items, accent != null ? accent : brandColor());
}

module.exports = { renderBlocks, blocksToItems, subst };
