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
const { mod } = require('../lib/state');
const { make, ok, err, COLORS } = require('../lib/embeds');

const APPEAL_PREFIX = 'hynex:appeal:'; // hynex:appeal:<guildId>
const MODAL_PREFIX = 'hynex:appealmodal:'; // hynex:appealmodal:<guildId>
const DECISION_PREFIX = 'hynex:appealdec:'; // hynex:appealdec:<a|d>:<guildId>:<userId>

/**
 * DM a member (still in the guild) a ban notice with an "Appeal" button. Sent
 * just before the ban while a DM channel is still reachable. Best-effort —
 * fails silently if the user has DMs closed.
 */
async function sendBanAppealDM(user, guild, reason) {
  if (!mod().banAppeal?.enabled) return;
  const embed = make({
    title: `You were banned from ${guild.name}`,
    description: `**Reason:** ${String(reason || 'No reason provided').slice(0, 1000)}\n\nIf you believe this was a mistake, you can appeal below.`,
    color: COLORS.danger,
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${APPEAL_PREFIX}${guild.id}`).setLabel('Appeal this ban').setStyle(ButtonStyle.Primary).setEmoji('📝'),
  );
  await user.send({ embeds: [embed], components: [row] }).catch(() => {});
}

/** Banned user clicked Appeal (in DMs) → open the appeal modal. */
async function handleAppealButton(interaction) {
  const guildId = interaction.customId.slice(APPEAL_PREFIX.length);
  const modal = new ModalBuilder().setCustomId(`${MODAL_PREFIX}${guildId}`).setTitle('Ban appeal');
  const reason = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel('Why should this ban be lifted?')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(reason));
  return interaction.showModal(modal);
}

/** Appeal modal submitted (in DMs) → post to the staff review channel. */
async function handleAppealModal(interaction) {
  const guildId = interaction.customId.slice(MODAL_PREFIX.length);
  const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
  const channelId = mod().banAppeal?.channelId;
  const channel = guild && channelId ? await guild.channels.fetch(channelId).catch(() => null) : null;
  if (!channel || !channel.isTextBased?.()) {
    return interaction.reply({ embeds: [err('Appeals aren’t set up for that server right now.')], flags: MessageFlags.Ephemeral });
  }

  const reason = interaction.fields.getTextInputValue('reason').trim();
  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setAuthor({ name: `${interaction.user.tag} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle('📝 Ban appeal')
    .addFields(
      { name: 'User', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)`, inline: false },
      { name: 'Appeal', value: reason.slice(0, 1024) || '—', inline: false },
    )
    .setFooter({ text: 'Hynex Bots' })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${DECISION_PREFIX}a:${guildId}:${interaction.user.id}`).setLabel('Approve & unban').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`${DECISION_PREFIX}d:${guildId}:${interaction.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger).setEmoji('✖️'),
  );
  await channel.send({ embeds: [embed], components: [row] }).catch(() => {});
  return interaction.reply({ embeds: [ok('Your appeal was submitted — staff will review it. ✅')], flags: MessageFlags.Ephemeral });
}

const canReview = (member) =>
  member && (member.id === member.guild?.ownerId || member.permissions?.has(PermissionFlagsBits.Administrator) || member.permissions?.has(PermissionFlagsBits.BanMembers));

/** Staff approved/denied an appeal (in the guild). */
async function handleAppealDecision(interaction) {
  if (!canReview(interaction.member)) {
    return interaction.reply({ embeds: [err('Only staff can review appeals.')], flags: MessageFlags.Ephemeral });
  }
  const [, , verdict, guildId, userId] = interaction.customId.split(':'); // hynex:appealdec:<a|d>:<guildId>:<userId>
  const approved = verdict === 'a';

  if (approved) {
    try {
      await interaction.guild.bans.remove(userId, `Appeal approved by ${interaction.user.tag}`);
    } catch {
      return interaction.reply({ embeds: [err('Couldn’t unban them — they may already be unbanned, or I’m missing Ban Members.')], flags: MessageFlags.Ephemeral });
    }
    const user = await interaction.client.users.fetch(userId).catch(() => null);
    user?.send({ embeds: [ok(`✅ Your ban appeal in **${interaction.guild.name}** was **approved** — you’ve been unbanned.`)] }).catch(() => {});
  } else {
    const user = await interaction.client.users.fetch(userId).catch(() => null);
    user?.send({ embeds: [err(`Your ban appeal in **${interaction.guild.name}** was **denied**.`)] }).catch(() => {});
  }

  void guildId;
  const resolved = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(approved ? COLORS.success : COLORS.danger)
    .addFields({ name: approved ? 'Approved by' : 'Denied by', value: `<@${interaction.user.id}>`, inline: true });
  await interaction.update({ embeds: [resolved], components: [] }).catch(() => {});
}

module.exports = {
  APPEAL_PREFIX,
  MODAL_PREFIX,
  DECISION_PREFIX,
  sendBanAppealDM,
  handleAppealButton,
  handleAppealModal,
  handleAppealDecision,
};
