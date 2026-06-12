'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { fivem } = require('../lib/state');
const { v2, make, ok, err, COLORS, brandColor } = require('../lib/embeds');
const store = require('../lib/store');

const APPLY_BUTTON_ID = 'hynex:wlapply';
const MODAL_ID = 'hynex:wlmodal';
const DECISION_PREFIX = 'hynex:wldec:'; // hynex:wldec:<a|d>:<userId>

/** The public "Apply for whitelist" panel (Components V2 container + button). */
function panelPayload() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(APPLY_BUTTON_ID).setLabel('Apply for whitelist').setStyle(ButtonStyle.Success).setEmoji('📝'),
  );
  return v2(
    ['## 📝 Whitelist application', 'Click below to apply for access to the server. Staff will review your application.', { separator: true }, { row }, '-# Hynex Bots'],
    brandColor(),
  );
}

/** Open the application modal when a member clicks Apply. */
async function handleApplyButton(interaction) {
  const app = fivem().whitelist?.application;
  if (!fivem().whitelist?.enabled || !app?.enabled) {
    return interaction.reply({ embeds: [err('Whitelist applications are currently closed.')], flags: MessageFlags.Ephemeral });
  }
  const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle('Whitelist application');
  const ign = new TextInputBuilder().setCustomId('ign').setLabel('In-game name').setStyle(TextInputStyle.Short).setMaxLength(64).setRequired(true);
  const ident = new TextInputBuilder()
    .setCustomId('identifier')
    .setLabel('Steam / license identifier')
    .setPlaceholder('e.g. steam:1100001... or license:abc123')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(128)
    .setRequired(true);
  const reason = new TextInputBuilder().setCustomId('reason').setLabel('Why do you want to join?').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(false);
  modal.addComponents(
    new ActionRowBuilder().addComponents(ign),
    new ActionRowBuilder().addComponents(ident),
    new ActionRowBuilder().addComponents(reason),
  );
  return interaction.showModal(modal);
}

/** Post a submitted application to the review channel for staff. */
async function handleModal(interaction) {
  const app = fivem().whitelist?.application;
  if (!fivem().whitelist?.enabled || !app?.enabled) {
    return interaction.reply({ embeds: [err('Whitelist applications are currently closed.')], flags: MessageFlags.Ephemeral });
  }
  const review = app.reviewChannelId ? await interaction.client.channels.fetch(app.reviewChannelId).catch(() => null) : null;
  if (!review || !review.isTextBased?.()) {
    return interaction.reply({ embeds: [err('No review channel is configured — ask an admin to set one in the dashboard.')], flags: MessageFlags.Ephemeral });
  }

  const ign = interaction.fields.getTextInputValue('ign').trim();
  const identifier = interaction.fields.getTextInputValue('identifier').trim();
  const reason = (interaction.fields.getTextInputValue('reason') || '').trim();

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setAuthor({ name: `${interaction.user.tag} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle('📝 Whitelist application')
    .addFields(
      { name: 'Applicant', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'In-game name', value: ign.slice(0, 256) || '—', inline: true },
      { name: 'Identifier', value: `\`${identifier.slice(0, 256) || '—'}\``, inline: false },
      { name: 'Reason', value: reason ? reason.slice(0, 1024) : '_None given_', inline: false },
    )
    .setFooter({ text: 'Hynex Bots' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${DECISION_PREFIX}a:${interaction.user.id}`).setLabel('Approve').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`${DECISION_PREFIX}d:${interaction.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger).setEmoji('✖️'),
  );

  await review.send({ embeds: [embed], components: [row] }).catch(() => {});
  return interaction.reply({ embeds: [ok('Your application was submitted — staff will review it shortly. ✅')], flags: MessageFlags.Ephemeral });
}

const canReview = (member) =>
  member && (member.id === member.guild?.ownerId || member.permissions?.has(PermissionFlagsBits.Administrator) || member.permissions?.has(PermissionFlagsBits.ManageGuild));

/** Staff clicked Approve/Deny on an application. */
async function handleDecision(interaction) {
  if (!canReview(interaction.member)) {
    return interaction.reply({ embeds: [err('Only staff can review applications.')], flags: MessageFlags.Ephemeral });
  }
  const [, , verdict, userId] = interaction.customId.split(':'); // hynex:wldec:<a|d>:<userId>
  const approved = verdict === 'a';

  const embed = interaction.message.embeds[0];
  const identifier = embed?.fields?.find((f) => f.name === 'Identifier')?.value?.replace(/`/g, '').trim() || '';
  const member = await interaction.guild.members.fetch(userId).catch(() => null);

  if (approved) {
    const roleId = fivem().whitelist?.roleId;
    if (roleId && member) {
      try {
        await member.roles.add(roleId, `Whitelist approved by ${interaction.user.tag}`);
      } catch {
        return interaction.reply({ embeds: [err('Approved, but I couldn’t assign the whitelist role — check my role position / permissions.')], flags: MessageFlags.Ephemeral });
      }
    }
    store.addWhitelist(interaction.guild.id, userId, identifier, interaction.user.id);
    member?.send({ embeds: [ok('✅ Your whitelist application was **approved** — welcome aboard!')] }).catch(() => {});
  } else {
    member?.send({ embeds: [err('Your whitelist application was **denied**. You can reach out to staff if you have questions.')] }).catch(() => {});
  }

  // Lock the application message with the outcome.
  const resolved = EmbedBuilder.from(embed)
    .setColor(approved ? COLORS.success : COLORS.danger)
    .addFields({ name: approved ? 'Approved by' : 'Denied by', value: `<@${interaction.user.id}>`, inline: true });
  await interaction.update({ embeds: [resolved], components: [] }).catch(() => {});
}

module.exports = { APPLY_BUTTON_ID, MODAL_ID, DECISION_PREFIX, panelPayload, handleApplyButton, handleModal, handleDecision };
