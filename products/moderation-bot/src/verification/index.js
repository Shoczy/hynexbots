'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { cfg } = require('../lib/state');
const { brandColor, ok, err, v2 } = require('../lib/embeds');
const { renderBlocks } = require('../lib/renderBlocks');

// Stable custom id so a panel posted long ago keeps working across restarts.
const VERIFY_BUTTON_ID = 'hynex:verify';

/** The verification panel message (Components V2 container + button), from live config. */
function panelPayload() {
  const v = cfg('verification', {});
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel(v.buttonLabel || 'Verify')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
  );

  // Custom panel content from the block builder — the functional verify button
  // is always appended after the customer's blocks.
  if (v.v2 && Array.isArray(v.v2.blocks) && v.v2.blocks.length) {
    const payload = renderBlocks({ ...v.v2, enabled: true }, {}, [{ separator: true }, { row }, '-# Hynex Bots']);
    if (payload) return payload;
  }

  // Fallback when no panel blocks are configured (the defaults normally seed two).
  return v2(
    [
      '## Verify to continue',
      'Click the button below to unlock the server.',
      { separator: true },
      { row },
      '-# Hynex Bots',
    ],
    brandColor(),
  );
}

/** Handle a click on the Verify button: grant the configured role. */
async function handleVerifyButton(interaction) {
  if (!cfg('modules.verification', false)) {
    return interaction.reply({ embeds: [err('Verification is currently disabled.')], flags: MessageFlags.Ephemeral });
  }
  const roleId = cfg('verification.roleId', '');
  if (!roleId) {
    return interaction.reply({
      embeds: [err('No verified role is configured yet — ask an admin to set one in the dashboard.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const member = interaction.member;
  if (member.roles.cache.has(roleId)) {
    return interaction.reply({ embeds: [ok('You’re already verified. ✅')], flags: MessageFlags.Ephemeral });
  }

  try {
    await member.roles.add(roleId, 'Verified via button');
  } catch {
    return interaction.reply({
      embeds: [err('I couldn’t assign the verified role — my role may sit below it, or I’m missing Manage Roles.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const msg = cfg('verification.successMessage', 'You’re verified — welcome aboard! 🎉');
  return interaction.reply({ embeds: [ok(msg)], flags: MessageFlags.Ephemeral });
}

module.exports = { VERIFY_BUTTON_ID, panelPayload, handleVerifyButton };
