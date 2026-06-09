'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { cfg } = require('../lib/state');
const { brandColor, ok, err } = require('../lib/embeds');

// Button ids carry the role: `hynex:rr:<roleId>`.
const PREFIX = 'hynex:rr:';

function panels() {
  return cfg('reactionRoles.panels', []) || [];
}

/** Every role id that appears in a configured panel — the toggle whitelist. */
function allowedRoleIds() {
  const set = new Set();
  for (const p of panels()) for (const r of p.roles || []) if (r.roleId) set.add(r.roleId);
  return set;
}

/** Build the panel message (embed + up to 25 buttons across 5 rows). */
function panelPayload(panel) {
  const embed = new EmbedBuilder()
    .setColor(brandColor())
    .setTitle(panel.title || 'Pick your roles')
    .setFooter({ text: 'Hynex Bots' });
  if (panel.description) embed.setDescription(panel.description);

  const rows = [];
  let row = new ActionRowBuilder();
  for (const r of (panel.roles || []).slice(0, 25)) {
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
    const btn = new ButtonBuilder().setCustomId(PREFIX + r.roleId).setLabel(r.label || 'Role').setStyle(ButtonStyle.Secondary);
    if (r.emoji) {
      try {
        btn.setEmoji(r.emoji);
      } catch {
        /* invalid emoji — skip it, keep the label */
      }
    }
    row.addComponents(btn);
  }
  if (row.components.length) rows.push(row);
  return { embeds: [embed], components: rows };
}

/** Toggle the clicked role on the member (only roles configured in a panel). */
async function handleButton(interaction) {
  if (!cfg('modules.reactionroles', false)) {
    return interaction.reply({ embeds: [err('Self-roles are currently disabled.')], ephemeral: true });
  }
  const roleId = interaction.customId.slice(PREFIX.length);
  if (!allowedRoleIds().has(roleId)) {
    return interaction.reply({ embeds: [err('That role isn’t available anymore.')], ephemeral: true });
  }

  const member = interaction.member;
  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId, 'Self-role');
      return interaction.reply({ embeds: [ok(`Removed <@&${roleId}>.`)], ephemeral: true });
    }
    await member.roles.add(roleId, 'Self-role');
    return interaction.reply({ embeds: [ok(`Added <@&${roleId}>.`)], ephemeral: true });
  } catch {
    return interaction.reply({
      embeds: [err('I couldn’t change that role — it may sit above my highest role, or I’m missing Manage Roles.')],
      ephemeral: true,
    });
  }
}

module.exports = { PREFIX, panels, panelPayload, handleButton };
