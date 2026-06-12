'use strict';

const { EmbedBuilder, ChannelType } = require('discord.js');
const { mod } = require('../lib/state');
const { COLORS } = require('../lib/embeds');
const store = require('../lib/store');

const CLOSE_KEYWORD = '=close';
const NOTE_PREFIX = '//';

/** A thread that belongs to the modmail inbox channel. */
function isModmailThread(channel) {
  return Boolean(channel?.isThread?.() && mod().modmail?.channelId && channel.parentId === mod().modmail.channelId);
}

function attachmentText(message) {
  const urls = [...message.attachments.values()].map((a) => a.url);
  return urls.length ? `\n\n${urls.join('\n')}` : '';
}

/** A member DM'd the bot → relay into their staff thread (creating it if needed). */
async function handleDM(message, client) {
  const mm = mod().modmail;
  if (!mm?.enabled || !mm.channelId) return;
  const inbox = await client.channels.fetch(mm.channelId).catch(() => null);
  if (!inbox || typeof inbox.threads?.create !== 'function') return;
  const guild = inbox.guild;

  let thread = null;
  const existingId = store.getModmailThread(message.author.id);
  if (existingId) thread = await guild.channels.fetch(existingId).catch(() => null);

  if (!thread || thread.archived) {
    thread = await inbox.threads
      .create({
        name: `${message.author.username} • ${message.author.id}`.slice(0, 90),
        autoArchiveDuration: 1440,
        type: ChannelType.PublicThread,
        reason: 'Modmail conversation',
      })
      .catch(() => null);
    if (!thread) return message.react('⚠️').catch(() => {});
    store.setModmailThread(message.author.id, thread.id, guild.id);
    const ping = mm.pingRoleId ? `<@&${mm.pingRoleId}> ` : '';
    await thread
      .send({
        content: `${ping}New modmail from <@${message.author.id}> (\`${message.author.id}\`).\nReply here to message them · start a line with \`//\` for a private note · send \`=close\` to close.`,
        allowedMentions: { roles: mm.pingRoleId ? [mm.pingRoleId] : [] },
      })
      .catch(() => {});
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setDescription(((message.content || '_(no text)_') + attachmentText(message)).slice(0, 4000))
    .setFooter({ text: 'Member' })
    .setTimestamp();
  const sent = await thread.send({ embeds: [embed] }).catch(() => null);
  await message.react(sent ? '✅' : '⚠️').catch(() => {});
}

/** A staff message in a modmail thread → relay to the member (or //note / =close). */
async function handleThreadReply(message) {
  const userId = store.getModmailUser(message.channel.id);
  if (!userId) return;
  const content = (message.content || '').trim();
  if (content.startsWith(NOTE_PREFIX)) return; // internal note — not relayed

  const user = await message.client.users.fetch(userId).catch(() => null);

  if (content === CLOSE_KEYWORD) {
    store.closeModmail(userId);
    user?.send({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('📪 This conversation was closed by staff. DM again to start a new one.')] }).catch(() => {});
    await message.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription(`Closed by <@${message.author.id}>.`)] }).catch(() => {});
    await message.channel.setArchived(true).catch(() => {});
    return;
  }

  if (!user) return message.react('⚠️').catch(() => {});
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: message.member?.displayName || message.author.username, iconURL: message.author.displayAvatarURL() })
    .setDescription(((content || '_(no text)_') + attachmentText(message)).slice(0, 4000))
    .setFooter({ text: 'Staff reply' })
    .setTimestamp();
  const delivered = await user.send({ embeds: [embed] }).catch(() => null);
  await message.react(delivered ? '📨' : '⚠️').catch(() => {});
}

module.exports = { isModmailThread, handleDM, handleThreadReply };
