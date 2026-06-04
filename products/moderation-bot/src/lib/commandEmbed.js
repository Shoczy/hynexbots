'use strict';

const { EmbedBuilder } = require('discord.js');
const { cfg } = require('./state');
const { brandColor } = require('./embeds');

/** Replace {name} tokens with live values; unknown tokens are left as-is. */
function substitute(str, vars) {
  return String(str || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : `{${k}}`));
}

/**
 * If the customer configured a custom reply embed for `name` (in the dashboard
 * Commands tab), build it with `vars` substituted. Otherwise return null so the
 * caller falls back to its built-in response.
 */
function commandEmbed(name, vars = {}) {
  const c = cfg('commands', {})[name]?.embed;
  if (!c || !c.enabled) return null;
  const e = new EmbedBuilder();
  const color = /^#[0-9a-fA-F]{6}$/.test(c.color || '') ? parseInt(c.color.slice(1), 16) : brandColor();
  e.setColor(color);
  if (c.title) e.setTitle(substitute(c.title, vars).slice(0, 256));
  const desc = substitute(c.description, vars).slice(0, 4096);
  if (desc) e.setDescription(desc);
  e.setFooter({ text: c.footer ? substitute(c.footer, vars).slice(0, 2048) : 'Hynex Bots' });
  e.setTimestamp();
  return e;
}

module.exports = { commandEmbed };
