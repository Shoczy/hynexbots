const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  FileBuilder,
} = require('discord.js');
const config = require('../config');
const store = require('../store');
const { V2, text, sep, container } = require('../lib/components');

// Minimum wait between a user opening tickets, to stop open/close spam.
const TICKET_COOLDOWN_MS = 60_000;

/** Buttons shown inside an open ticket. */
function ticketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger),
  );
}

/**
 * Create a ticket channel for a buyer.
 * @param {import('discord.js').Interaction} interaction
 * @param {{ type: 'purchase'|'custom', product?: object, details?: string }} opts
 */
async function createTicket(interaction, opts) {
  const { guild, user } = interaction;

  const data = store.read();

  // Prevent duplicate open tickets per user. If the stored channel no longer
  // exists (e.g. it was deleted manually rather than via Close), self-heal by
  // dropping the stale entry instead of blocking the user forever.
  const existing = Object.entries(data.tickets).find(([, t]) => t.ownerId === user.id);
  if (existing) {
    const ch = guild.channels.cache.get(existing[0]);
    if (ch) {
      return interaction.reply({ content: `You already have an open ticket: ${ch}`, ephemeral: true });
    }
    store.update((d) => {
      delete d.tickets[existing[0]];
    });
  }

  // Cooldown: stop a user from rapidly opening/closing tickets.
  const lastAt = data.cooldowns?.[user.id] || 0;
  const waited = Date.now() - lastAt;
  if (waited < TICKET_COOLDOWN_MS) {
    const secs = Math.ceil((TICKET_COOLDOWN_MS - waited) / 1000);
    return interaction.reply({
      content: `Please wait ${secs}s before opening another ticket.`,
      ephemeral: true,
    });
  }

  const number = (data.ticketCounter || 0) + 1;
  const name = `ticket-${String(number).padStart(4, '0')}`;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];
  if (config.tickets.staffRoleId) {
    overwrites.push({
      id: config.tickets.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: config.tickets.categoryId || undefined,
    permissionOverwrites: overwrites,
    topic: `Owner: ${user.id} • Type: ${opts.type}`,
  });

  store.update((d) => {
    d.ticketCounter = number;
    d.tickets[channel.id] = {
      ownerId: user.id,
      type: opts.type,
      productId: opts.product?.id || null,
      createdAt: Date.now(),
      claimedBy: null,
    };
    d.cooldowns = d.cooldowns || {};
    d.cooldowns[user.id] = Date.now();
  });

  // Build the opening message (Components V2).
  const staff = config.tickets.staffRoleId ? ` · <@&${config.tickets.staffRoleId}>` : '';
  let heading;
  let body;
  if (opts.type === 'purchase' && opts.product) {
    heading = `### ${opts.product.emoji} ${opts.product.label} · ${opts.product.price}`;
    body =
      `Thanks for your order, <@${user.id}>. A team member will be with you shortly to arrange ` +
      `delivery, setup and payment.\n\nWhile you wait, let us know your server name and anything ` +
      `you'd like customised.`;
  } else {
    heading = '### Custom bot request';
    body =
      `Thanks, <@${user.id}>. ` +
      (opts.details ? `Here's what we've got:\n\n>>> ${opts.details}\n\n` : '') +
      `We'll review your request and reply with a quote and timeline.`;
  }

  const view = container(config.brand.color, [
    text(`<@${user.id}>${staff}`),
    text(heading),
    text(body),
    sep(),
    ticketControls(),
  ]);

  await channel.send({
    flags: V2,
    components: [view],
    allowedMentions: { users: [user.id], roles: config.tickets.staffRoleId ? [config.tickets.staffRoleId] : [] },
  });

  return interaction.reply({ content: `Your ticket is ready: ${channel}`, ephemeral: true });
}

async function claimTicket(interaction) {
  const data = store.read();
  const ticket = data.tickets[interaction.channel.id];
  if (!ticket) return interaction.reply({ content: 'This is not an active ticket.', ephemeral: true });
  if (config.tickets.staffRoleId && !interaction.member.roles.cache.has(config.tickets.staffRoleId)) {
    return interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });
  }
  if (ticket.claimedBy) {
    return interaction.reply({ content: `Already claimed by <@${ticket.claimedBy}>.`, ephemeral: true });
  }
  store.update((d) => {
    d.tickets[interaction.channel.id].claimedBy = interaction.user.id;
  });
  const view = container(config.brand.success, [
    text(`Claimed by <@${interaction.user.id}> — they'll be looking after this ticket.`),
  ]);
  await interaction.reply({ flags: V2, components: [view] });
}

async function closeTicket(interaction) {
  const data = store.read();
  const ticket = data.tickets[interaction.channel.id];
  if (!ticket) return interaction.reply({ content: 'This is not an active ticket.', ephemeral: true });

  await interaction.reply({
    flags: V2,
    components: [container(config.brand.warning, [text('Closing this ticket — saving a transcript first. (5s)')])],
  });

  // Build a simple text transcript.
  let transcript = `Transcript — #${interaction.channel.name}\n`;
  transcript += `Closed by ${interaction.user.tag} on ${new Date().toISOString()}\n`;
  transcript += '─'.repeat(50) + '\n';
  try {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    for (const msg of [...messages.values()].reverse()) {
      const time = new Date(msg.createdTimestamp).toISOString();
      const content = msg.content || (msg.components.length ? '[components]' : '[attachment]');
      transcript += `[${time}] ${msg.author.tag}: ${content}\n`;
    }
  } catch {
    transcript += '(could not fetch messages)\n';
  }

  if (config.tickets.transcriptChannelId) {
    const tc = interaction.guild.channels.cache.get(config.tickets.transcriptChannelId);
    if (tc) {
      const fileName = `${interaction.channel.name}.txt`;
      const view = container(config.brand.color, [
        text(
          `### Ticket transcript\n**Channel** \`${interaction.channel.name}\`\n` +
            `**Owner** <@${ticket.ownerId}>\n**Type** ${ticket.type}\n**Closed by** <@${interaction.user.id}>`,
        ),
        sep(),
        new FileBuilder().setURL(`attachment://${fileName}`),
      ]);
      await tc.send({
        flags: V2,
        components: [view],
        files: [{ attachment: Buffer.from(transcript, 'utf8'), name: fileName }],
        allowedMentions: { parse: [] },
      });
    }
  }

  store.update((d) => {
    delete d.tickets[interaction.channel.id];
  });

  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

module.exports = { createTicket, claimTicket, closeTicket, ticketControls };
