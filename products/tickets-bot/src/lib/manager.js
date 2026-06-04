'use strict';

const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} = require('discord.js');
const { tickets } = require('./state');
const { make, info, ok, err } = require('./embeds');
const { commandEmbed } = require('./commandEmbed');
const { isStaff } = require('./perms');
const store = require('./store');

const ID = {
  OPEN: 'ticket_open',
  TOPIC: 'ticket_topic',
  CLOSE: 'ticket_close',
  CLAIM: 'ticket_claim',
};

/** Build the panel message (a button, or a topic select when topics exist). */
function buildPanel(guild) {
  const t = tickets();
  const embed = make({
    author: guild ? { name: guild.name, iconURL: guild.iconURL({ size: 128 }) || undefined } : undefined,
    title: t.panel.title,
    description: t.panel.description,
  });
  const cats = t.categories || [];

  let row;
  if (cats.length) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(ID.TOPIC)
      .setPlaceholder('Choose a topic…')
      .addOptions(
        cats.slice(0, 25).map((c) => ({
          label: c.label.slice(0, 100),
          value: c.id,
          ...(c.emoji ? { emoji: c.emoji } : {}),
        })),
      );
    row = new ActionRowBuilder().addComponents(menu);
  } else {
    row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(ID.OPEN).setLabel(t.panel.buttonLabel || 'Open a ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
    );
  }
  return { embeds: [embed], components: [row] };
}

function controlRow() {
  const t = tickets();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(ID.CLOSE).setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );
  if (t.claiming) {
    row.addComponents(new ButtonBuilder().setCustomId(ID.CLAIM).setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('✋'));
  }
  return row;
}

/** Open a ticket for the requesting member. `ctx` is built by ctxFrom*(). */
async function openTicket(ctx, topicId = '') {
  const t = tickets();
  const guild = ctx.guild;
  const opener = ctx.member;

  const open = store.openCount(guild.id, opener.id);
  if (open >= (t.maxOpenPerUser || 1)) {
    return ctx.reply(err(`You already have **${open}** open ticket(s). Close one before opening another.`));
  }

  const topic = (t.categories || []).find((c) => c.id === topicId);
  const me = guild.members.me;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: opener.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
    },
    { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
  ];
  for (const roleId of t.staffRoleIds || []) {
    if (guild.roles.cache.has(roleId)) {
      overwrites.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name: `ticket-${opener.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90) || `ticket-${opener.id}`,
      type: ChannelType.GuildText,
      parent: t.categoryId && guild.channels.cache.get(t.categoryId)?.type === ChannelType.GuildCategory ? t.categoryId : undefined,
      topic: `Ticket by ${opener.user.tag}${topic ? ` — ${topic.label}` : ''}`,
      permissionOverwrites: overwrites,
    });
  } catch {
    return ctx.reply(err('I couldn\'t create the ticket channel — check my permissions and the configured category.'));
  }

  store.createTicket(channel.id, guild.id, opener.id, topic?.label || '');

  const staffPing = (t.staffRoleIds || []).map((r) => `<@&${r}>`).join(' ');
  const welcome =
    commandEmbed('ticket', { user: opener.user.tag, server: guild.name }) ||
    make({
      author: { name: `${opener.user.tag}`, iconURL: opener.user.displayAvatarURL({ size: 128 }) },
      title: topic ? topic.label : 'Support Ticket',
      description: t.openMessage,
      thumbnail: guild.iconURL({ size: 256 }) || undefined,
      footer: { text: 'Use the buttons below to manage this ticket.' },
    });
  await channel.send({ content: `${opener} ${staffPing}`.trim(), embeds: [welcome], components: [controlRow()] });

  return ctx.reply(ok(`✅ Your ticket is open: ${channel}`));
}

async function claim(ctx) {
  const ticket = store.getTicket(ctx.channel.id);
  if (!ticket) return ctx.reply(err('This isn\'t a ticket channel.'));
  if (!isStaff(ctx.member)) return ctx.reply(err('Only staff can claim tickets.'));
  if (ticket.claimed_by) return ctx.reply(err(`Already claimed by <@${ticket.claimed_by}>.`));
  store.claimTicket(ctx.channel.id, ctx.user.id);
  await ctx.channel.send({ embeds: [info('Ticket Claimed', `✋ Claimed by ${ctx.user}.`)] });
  return ctx.reply(ok('You claimed this ticket.'));
}

/** Close a ticket: optional transcript, then delete the channel. */
async function closeTicket(ctx) {
  const channel = ctx.channel;
  const ticket = store.getTicket(channel.id);
  if (!ticket) return ctx.reply(err('This isn\'t a ticket channel.'));
  const member = ctx.member;
  if (!isStaff(member) && member.id !== ticket.user_id) {
    return ctx.reply(err('Only staff or the ticket owner can close this.'));
  }

  await ctx.reply(ok('🔒 Closing this ticket…'));
  const t = tickets();

  if (t.transcripts?.enabled && t.transcripts.channelId) {
    const dest = channel.guild.channels.cache.get(t.transcripts.channelId);
    if (dest?.isTextBased?.()) {
      try {
        const text = await buildTranscript(channel, ticket);
        const file = new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: `transcript-${channel.name}.txt` });
        const summary = info('Ticket Closed', `**Channel:** #${channel.name}\n**Opened by:** <@${ticket.user_id}>\n**Closed by:** ${ctx.user}\n**Claimed by:** ${ticket.claimed_by ? `<@${ticket.claimed_by}>` : '—'}`);
        await dest.send({ embeds: [summary], files: [file] });
      } catch {
        /* transcript failed — still close */
      }
    }
  }

  store.deleteTicket(channel.id);
  setTimeout(() => channel.delete('Ticket closed').catch(() => {}), 4000);
  return true;
}

async function buildTranscript(channel, ticket) {
  const lines = [
    `Transcript — #${channel.name}`,
    `Opened by: ${ticket.user_id}`,
    `Created: ${new Date(ticket.created_at).toISOString()}`,
    '─'.repeat(50),
    '',
  ];
  let before;
  const all = [];
  // Page back through history (newest→oldest), up to ~1000 messages.
  for (let i = 0; i < 10; i++) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  all.reverse();
  for (const m of all) {
    const ts = new Date(m.createdTimestamp).toISOString();
    const content = m.content || (m.embeds.length ? '[embed]' : m.attachments.size ? '[attachment]' : '');
    lines.push(`[${ts}] ${m.author.tag}: ${content}`);
  }
  return lines.join('\n');
}

async function addUser(channel, user) {
  const ticket = store.getTicket(channel.id);
  if (!ticket) return { ok: false, embed: err('This isn\'t a ticket channel.') };
  await channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });
  return { ok: true, embed: ok(`➕ Added ${user} to the ticket.`) };
}

async function removeUser(channel, user) {
  const ticket = store.getTicket(channel.id);
  if (!ticket) return { ok: false, embed: err('This isn\'t a ticket channel.') };
  await channel.permissionOverwrites.delete(user.id).catch(() => {});
  return { ok: true, embed: ok(`➖ Removed ${user} from the ticket.`) };
}

/** Build a context from a slash/button/select interaction (ephemeral replies). */
function ctxFromInteraction(interaction) {
  return {
    guild: interaction.guild,
    member: interaction.member,
    user: interaction.user,
    channel: interaction.channel,
    reply: (embed) => {
      const payload = { embeds: [embed], ephemeral: true };
      if (interaction.replied || interaction.deferred) return interaction.followUp(payload).catch(() => {});
      return interaction.reply(payload).catch(() => {});
    },
  };
}

/** Build a context from a prefix-command message (in-channel replies). */
function ctxFromMessage(message) {
  return {
    guild: message.guild,
    member: message.member,
    user: message.author,
    channel: message.channel,
    reply: (embed) => message.channel.send({ embeds: [embed] }).catch(() => {}),
  };
}

module.exports = { ID, buildPanel, openTicket, claim, closeTicket, addUser, removeUser, ctxFromInteraction, ctxFromMessage };
