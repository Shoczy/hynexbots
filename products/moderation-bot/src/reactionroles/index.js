'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { cfg } = require('../lib/state');
const { v2, brandColor, ok, err } = require('../lib/embeds');

const RR_PREFIX = 'hynex:rr:'; // hynex:rr:<roleId>

/** Build the Components V2 payload for one reaction-role panel. */
function panelPayload(panel) {
  const rows = [];
  let row = new ActionRowBuilder();
  for (const r of panel.roles || []) {
    if (!r.roleId) continue;
    const btn = new ButtonBuilder().setCustomId(`${RR_PREFIX}${r.roleId}`).setLabel((r.label || 'Role').slice(0, 80)).setStyle(ButtonStyle.Secondary);
    if (r.emoji) {
      try {
        btn.setEmoji(r.emoji);
      } catch {
        /* ignore an emoji Discord won't accept */
      }
    }
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
    row.addComponents(btn);
  }
  if (row.components.length) rows.push(row);

  const items = [`## ${panel.title || 'Pick your roles'}`];
  if (panel.description) items.push(panel.description);
  items.push({ separator: true });
  for (const rw of rows) items.push({ row: rw });
  return v2(items, brandColor());
}

/** Every role id offered across all configured panels (for validation). */
function configuredRoleIds() {
  const panels = cfg('reactionRoles', {}).panels || [];
  const ids = new Set();
  for (const p of panels) for (const r of p.roles || []) if (r.roleId) ids.add(r.roleId);
  return ids;
}

/** A member clicked a reaction-role button → toggle the role. */
async function handleButton(interaction) {
  if (!cfg('modules.reactionroles', false)) {
    return interaction.reply({ embeds: [err('Reaction roles are disabled.')], flags: MessageFlags.Ephemeral });
  }
  const roleId = interaction.customId.slice(RR_PREFIX.length);
  if (!configuredRoleIds().has(roleId)) {
    return interaction.reply({ embeds: [err("That role isn't available anymore.")], flags: MessageFlags.Ephemeral });
  }
  const member = interaction.member;
  const had = member.roles.cache.has(roleId);
  try {
    if (had) await member.roles.remove(roleId, 'Reaction role');
    else await member.roles.add(roleId, 'Reaction role');
  } catch {
    return interaction.reply({ embeds: [err("I couldn't change that role — check my permissions and role position.")], flags: MessageFlags.Ephemeral });
  }
  return interaction.reply({ embeds: [ok(had ? `Removed <@&${roleId}>.` : `Added <@&${roleId}>.`)], flags: MessageFlags.Ephemeral });
}

module.exports = { RR_PREFIX, panelPayload, handleButton, configuredRoleIds };
