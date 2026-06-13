'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { cfg } = require('../lib/state');
const { make, ok, err, COLORS, brandColor } = require('../lib/embeds');
const store = require('../lib/store');

const UP_ID = 'hynex:sg:up';
const DOWN_ID = 'hynex:sg:down';
const APPROVE_ID = 'hynex:sgdec:a';
const DENY_ID = 'hynex:sgdec:d';

const STATUS = {
  open: { label: 'Open', color: brandColor },
  approved: { label: '✅ Approved', color: () => COLORS.success },
  denied: { label: '❌ Denied', color: () => COLORS.danger },
};

function voteRow(up, down, resolved = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(UP_ID).setStyle(ButtonStyle.Success).setEmoji('👍').setLabel(String(up)).setDisabled(resolved),
    new ButtonBuilder().setCustomId(DOWN_ID).setStyle(ButtonStyle.Danger).setEmoji('👎').setLabel(String(down)).setDisabled(resolved),
  );
  if (!resolved) {
    row.addComponents(
      new ButtonBuilder().setCustomId(APPROVE_ID).setStyle(ButtonStyle.Secondary).setLabel('Approve'),
      new ButtonBuilder().setCustomId(DENY_ID).setStyle(ButtonStyle.Secondary).setLabel('Deny'),
    );
  }
  return row;
}

function suggestionEmbed({ text, authorId, anonymous, status = 'open', resolverId = null }) {
  const meta = STATUS[status] || STATUS.open;
  const fields = [];
  if (resolverId) fields.push({ name: status === 'approved' ? 'Approved by' : 'Denied by', value: `<@${resolverId}>`, inline: true });
  // The non-anonymous footer (with avatar) is set by the caller via setFooter().
  return make({
    author: anonymous ? { name: 'Anonymous suggestion' } : undefined,
    title: status === 'open' ? '💡 Suggestion' : `💡 Suggestion — ${meta.label}`,
    description: text.slice(0, 3000),
    color: meta.color(),
    fields,
  });
}

/** Who may approve/deny: Manage Server, owner, or a configured approver role. */
function canResolve(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(require('discord.js').PermissionFlagsBits.ManageGuild)) return true;
  return (cfg('suggestions.approverRoleIds', []) || []).some((id) => member.roles.cache.has(id));
}

/** Submit a new suggestion to the configured channel. Returns true on success. */
async function submit(interaction, text) {
  const s = cfg('suggestions', {});
  const channel = s.channelId ? await interaction.client.channels.fetch(s.channelId).catch(() => null) : null;
  if (!channel || !channel.isTextBased?.()) {
    await interaction.reply({ embeds: [err('No suggestions channel is set up yet — ask an admin to configure it in the dashboard.')], flags: MessageFlags.Ephemeral });
    return false;
  }
  const anonymous = Boolean(s.anonymous);
  const embed = suggestionEmbed({ text, authorId: interaction.user.id, anonymous });
  if (!anonymous) embed.setFooter({ text: `Suggested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
  const msg = await channel.send({ embeds: [embed], components: [voteRow(0, 0)] }).catch(() => null);
  if (!msg) {
    await interaction.reply({ embeds: [err('I couldn\'t post in the suggestions channel — check my permissions there.')], flags: MessageFlags.Ephemeral });
    return false;
  }
  store.createSuggestion({ messageId: msg.id, guildId: interaction.guild.id, channelId: channel.id, authorId: interaction.user.id });
  await interaction.reply({ embeds: [ok(`Your suggestion was posted in ${channel}. 💡`)], flags: MessageFlags.Ephemeral });
  return true;
}

/** Handle a 👍/👎 vote button. */
async function handleVote(interaction) {
  const sug = store.getSuggestion(interaction.message.id);
  if (!sug || sug.status !== 'open') {
    return interaction.reply({ embeds: [make({ description: 'Voting is closed on this suggestion.', color: COLORS.warning })], flags: MessageFlags.Ephemeral });
  }
  const { up, down } = store.voteSuggestion(interaction.message.id, interaction.user.id, interaction.customId === UP_ID ? 1 : -1);
  await interaction.update({ components: [voteRow(up, down)] }).catch(() => {});
}

/** Handle an Approve/Deny button (approver-gated). */
async function handleDecision(interaction) {
  const sug = store.getSuggestion(interaction.message.id);
  if (!sug) return;
  if (!canResolve(interaction.member)) {
    return interaction.reply({ embeds: [err('Only staff can approve or deny suggestions.')], flags: MessageFlags.Ephemeral });
  }
  const status = interaction.customId === APPROVE_ID ? 'approved' : 'denied';
  store.setSuggestionStatus(interaction.message.id, status);
  const { up, down } = store.suggestionTally(interaction.message.id);
  const base = interaction.message.embeds[0];
  const { EmbedBuilder } = require('discord.js');
  const updated = EmbedBuilder.from(base)
    .setColor(status === 'approved' ? COLORS.success : COLORS.danger)
    .setTitle(`💡 Suggestion — ${status === 'approved' ? '✅ Approved' : '❌ Denied'}`)
    .addFields({ name: status === 'approved' ? 'Approved by' : 'Denied by', value: `<@${interaction.user.id}>`, inline: true });
  await interaction.update({ embeds: [updated], components: [voteRow(up, down, true)] }).catch(() => {});
}

const isVote = (id) => id === UP_ID || id === DOWN_ID;
const isDecision = (id) => id === APPROVE_ID || id === DENY_ID;

module.exports = { submit, handleVote, handleDecision, isVote, isDecision };
