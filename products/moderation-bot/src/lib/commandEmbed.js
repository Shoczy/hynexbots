'use strict';

const { EmbedBuilder } = require('discord.js');
const { cfg } = require('./state');
const { brandColor } = require('./embeds');
const { renderBlocks } = require('./renderBlocks');

/** Replace {name} tokens with live values; unknown tokens are left as-is. */
function substitute(str, vars) {
  return String(str || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : `{${k}}`));
}

/**
 * If the customer enabled a custom reply for `name` (dashboard Commands tab),
 * build a ready-to-send message fragment with `vars` substituted — either a
 * Components V2 payload ({ flags, components }) when they designed blocks, or a
 * legacy embed ({ embeds: [...] }). Returns null so the caller falls back to its
 * built-in response.
 */
function commandReply(name, vars = {}) {
  const c = cfg('commands', {})[name]?.embed;
  if (!c || !c.enabled) return null;

  // Block builder wins when the customer placed any blocks.
  if (c.v2 && Array.isArray(c.v2.blocks) && c.v2.blocks.length) {
    const payload = renderBlocks({ ...c.v2, enabled: true }, vars);
    if (payload) return payload;
  }

  // Legacy single embed (title / description / footer / color).
  const e = new EmbedBuilder();
  const color = /^#[0-9a-fA-F]{6}$/.test(c.color || '') ? parseInt(c.color.slice(1), 16) : brandColor();
  e.setColor(color);
  if (c.title) e.setTitle(substitute(c.title, vars).slice(0, 256));
  const desc = substitute(c.description, vars).slice(0, 4096);
  if (desc) e.setDescription(desc);
  e.setFooter({ text: c.footer ? substitute(c.footer, vars).slice(0, 2048) : 'Hynex Bots' });
  e.setTimestamp();
  return { embeds: [e] };
}

module.exports = { commandReply };
