'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { cfg } = require('../lib/state');
const { brandColor, ok, err, v2 } = require('../lib/embeds');

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
  return v2(
    [
      `## ${v.title || 'Verify to continue'}`,
      v.description || 'Click the button below to unlock the server.',
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
    return interaction.reply({ embeds: [err('Verification is currently disabled.')], ephemeral: true });
  }
  const roleId = cfg('verification.roleId', '');
  if (!roleId) {
    return interaction.reply({
      embeds: [err('No verified role is configured yet — ask an admin to set one in the dashboard.')],
      ephemeral: true,
    });
  }

  const member = interaction.member;
  if (member.roles.cache.has(roleId)) {
    return interaction.reply({ embeds: [ok('You’re already verified. ✅')], ephemeral: true });
  }

  try {
    await member.roles.add(roleId, 'Verified via button');
  } catch {
    return interaction.reply({
      embeds: [err('I couldn’t assign the verified role — my role may sit below it, or I’m missing Manage Roles.')],
      ephemeral: true,
    });
  }

  const msg = cfg('verification.successMessage', 'You’re verified — welcome aboard! 🎉');
  return interaction.reply({ embeds: [ok(msg)], ephemeral: true });
}

module.exports = { VERIFY_BUTTON_ID, panelPayload, handleVerifyButton };
