'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { cfg } = require('../lib/state');
const { isStaff } = require('../lib/perms');
const { make, ok, err, COLORS } = require('../lib/embeds');

const MODAL_PREFIX = 'hynex:apply:'; // + formId
const DECISION_PREFIX = 'hynex:appdec:'; // + a|d + ':' + userId

function forms() {
  return cfg('applications.forms', []) || [];
}
function findForm(id) {
  return forms().find((f) => f.id === id) || null;
}

/** Build the application modal for a form (≤5 questions). */
function buildModal(form) {
  const modal = new ModalBuilder().setCustomId(MODAL_PREFIX + form.id).setTitle((form.name || 'Application').slice(0, 45));
  for (const q of (form.questions || []).slice(0, 5)) {
    const input = new TextInputBuilder()
      .setCustomId(q.id)
      .setLabel((q.label || 'Question').slice(0, 45))
      .setStyle(q.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(Boolean(q.required))
      .setMaxLength(q.style === 'paragraph' ? 1000 : 300);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

/** Handle a submitted application modal: post it to the review channel. */
async function handleModal(interaction) {
  if (!cfg('modules.applications', false)) {
    return interaction.reply({ embeds: [err('Applications are currently closed.')], ephemeral: true });
  }
  const formId = interaction.customId.slice(MODAL_PREFIX.length);
  const form = findForm(formId);
  if (!form) {
    return interaction.reply({ embeds: [err('That application form no longer exists.')], ephemeral: true });
  }

  const fields = (form.questions || []).map((q) => {
    let answer = '';
    try {
      answer = interaction.fields.getTextInputValue(q.id);
    } catch {
      answer = '';
    }
    return { name: (q.label || 'Question').slice(0, 256), value: (answer || '—').slice(0, 1024) };
  });

  const reviewId = cfg('applications.reviewChannelId', '');
  const channel = reviewId ? interaction.guild.channels.cache.get(reviewId) : null;
  if (!(channel && channel.isTextBased?.())) {
    return interaction.reply({
      embeds: [err('No review channel is configured — ask an admin to set one in the dashboard.')],
      ephemeral: true,
    });
  }

  const embed = make({
    title: `📨 New application — ${form.name}`,
    description: `From ${interaction.user} (\`${interaction.user.id}\`)`,
    fields,
    thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${DECISION_PREFIX}a:${interaction.user.id}`).setLabel('Approve').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`${DECISION_PREFIX}d:${interaction.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger).setEmoji('✖️'),
  );

  try {
    await channel.send({ embeds: [embed], components: [row] });
  } catch {
    return interaction.reply({ embeds: [err('I couldn’t post to the review channel — check my permissions there.')], ephemeral: true });
  }
  return interaction.reply({ embeds: [ok('Your application has been submitted — staff will review it soon. 📨')], ephemeral: true });
}

/** Handle an Approve/Deny button (staff only). */
async function handleDecision(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [err('Only staff can review applications.')], ephemeral: true });
  }
  const rest = interaction.customId.slice(DECISION_PREFIX.length); // "a:<id>" | "d:<id>"
  const approved = rest.startsWith('a:');
  const userId = rest.slice(2);

  if (approved) {
    const roleId = cfg('applications.approveRoleId', '');
    if (roleId) {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member) await member.roles.add(roleId, 'Application approved').catch(() => {});
    }
  }

  // Notify the applicant by DM (best-effort).
  try {
    const user = await interaction.client.users.fetch(userId);
    await user.send(
      approved
        ? `🎉 Your application in **${interaction.guild.name}** was **approved**!`
        : `Your application in **${interaction.guild.name}** was **not accepted** this time.`,
    );
  } catch {
    /* DMs closed */
  }

  // Lock the review message so it can't be actioned twice.
  const resultEmbed = make({
    title: approved ? '✅ Application approved' : '✖️ Application denied',
    description: `<@${userId}> — reviewed by ${interaction.user}.`,
    color: approved ? COLORS.success : COLORS.danger,
  });
  const lockedRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('hynex:appdone').setLabel(approved ? 'Approved' : 'Denied').setStyle(ButtonStyle.Secondary).setDisabled(true),
  );
  const original = interaction.message.embeds[0];
  return interaction.update({ embeds: original ? [original, resultEmbed] : [resultEmbed], components: [lockedRow] });
}

module.exports = { MODAL_PREFIX, DECISION_PREFIX, forms, findForm, buildModal, handleModal, handleDecision };
