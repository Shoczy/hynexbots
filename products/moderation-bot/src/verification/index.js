'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { cfg } = require('../lib/state');
const { brandColor, ok, err } = require('../lib/embeds');

// Stable custom id so a panel posted long ago keeps working across restarts.
const VERIFY_BUTTON_ID = 'hynex:verify';

/** The verification panel message (embed + button), built from live config. */
function panelPayload() {
  const v = cfg('verification', {});
  const embed = new EmbedBuilder()
    .setColor(brandColor())
    .setTitle(v.title || 'Verify to continue')
    .setDescription(v.description || 'Click the button below to unlock the server.')
    .setFooter({ text: 'Hynex Bots' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel(v.buttonLabel || 'Verify')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
  );
  return { embeds: [embed], components: [row] };
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
