const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  FileBuilder,
} = require('discord.js');
const config = require('../config');
const store = require('../store');
const orders = require('./orders');
const { V2, text, media, sep, container } = require('../lib/components');
const { parseEmoji } = require('../lib/emoji');

// Minimum wait between a user opening tickets, to stop open/close spam.
const TICKET_COOLDOWN_MS = 60_000;

/** Buttons shown inside an open ticket. */
function ticketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger),
  );
}

/** Staff-only order pipeline control (a dropdown), shown on purchase tickets. */
function orderControls() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('order_status_select')
    .setPlaceholder('🛠️ Staff · update order status…')
    .addOptions(
      { label: 'Mark as paid', value: 'paid', emoji: parseEmoji(orders.STATUS_META.paid.emoji), description: 'Payment received — sends the delivery message' },
      { label: 'Mark as delivered', value: 'delivered', emoji: parseEmoji(orders.STATUS_META.delivered.emoji), description: 'Bot handed over to the customer' },
      { label: 'Cancel order', value: 'cancelled', emoji: parseEmoji(orders.STATUS_META.cancelled.emoji), description: 'Void this order' },
    );
  return new ActionRowBuilder().addComponents(menu);
}

/**
 * Buyer-facing payment confirmation, shown on purchase tickets. For
 * crypto/manual transfers there's no payment gateway callback, so the buyer
 * presses this once they've sent payment — it flips the order to "paid" and
 * fires the automated delivery message, no staff action required.
 */
function paymentControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('order_confirm_payment')
      .setLabel("I've sent payment")
      .setEmoji('💸')
      .setStyle(ButtonStyle.Success),
  );
}

function isStaff(interaction) {
  if (config.tickets.staffRoleId && interaction.member?.roles?.cache?.has(config.tickets.staffRoleId)) return true;
  return Boolean(interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild));
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
      botName: opts.botName || null,
      payment: opts.payment || null,
      avatarUrl: opts.avatarUrl || null,
      createdAt: Date.now(),
      claimedBy: null,
    };
    d.cooldowns = d.cooldowns || {};
    d.cooldowns[user.id] = Date.now();
  });

  // Build the opening message (Components V2).
  const staff = config.tickets.staffRoleId ? ` · <@&${config.tickets.staffRoleId}>` : '';
  const children = [text(`<@${user.id}>${staff}`)];
  let order = null;
  if (opts.type === 'purchase' && opts.product) {
    // Record the order so manual sales become a trackable pipeline.
    order = orders.createOrder({
      channelId: channel.id,
      ownerId: user.id,
      product: opts.product,
      botName: opts.botName,
      payment: opts.payment,
      paymentLabel: opts.paymentLabelText,
    });

    children.push(text(`## ${opts.product.emoji} ${opts.product.label}`));

    // Compact order summary from the purchase modal.
    const lines = [`\`${order.id}\` · ${orders.STATUS_META.pending.emoji} **Pending** · ${opts.product.price}`];
    if (opts.botName) lines.push(`**Bot name** ${opts.botName}`);
    if (opts.paymentLabelText) lines.push(`**Payment** ${opts.paymentLabelText}`);
    children.push(text(lines.join('\n')));

    if (opts.avatarUrl) children.push(media(opts.avatarUrl));

    children.push(sep());
    children.push(
      text(
        `Thanks for your order, <@${user.id}> — a team member will be with you shortly to arrange delivery, setup & payment.`,
      ),
    );
  } else {
    children.push(text('### Custom bot request'));
    children.push(
      text(
        `Thanks, <@${user.id}>. ` +
          (opts.details ? `Here's what we've got:\n\n>>> ${opts.details}\n\n` : '') +
          `We'll review your request and reply with a quote and timeline.`,
      ),
    );
  }
  children.push(sep());
  if (order) {
    children.push(paymentControls());
    children.push(orderControls());
  }
  children.push(ticketControls());

  const view = container(config.brand.color, children);

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

/**
 * Automated "payment received → delivery underway" message. Posted whenever an
 * order moves to `paid` (whether the buyer self-confirms or staff marks it), so
 * the customer immediately gets next steps without anyone typing them out.
 */
function deliveryView(order, actorId) {
  const staffPing = config.tickets.staffRoleId ? ` <@&${config.tickets.staffRoleId}>` : '';
  return container(config.brand.success, [
    text(`${orders.STATUS_META.paid.emoji} Payment confirmed for \`${order.id}\` by <@${actorId}>.${staffPing}`),
    sep(),
    text(
      `### ✅ Payment received — delivery underway\n` +
        `Thanks <@${order.ownerId}>! Your payment is recorded. Our team will register your bot now, and ` +
        `you'll get a DM with your dashboard link the moment it's ready — just log in with Discord, ` +
        `your bot will already be there.\n\n` +
        `**Customize your bot here:** ${config.dashboardUrl}/dashboard`,
    ),
  ]);
}

/** Reply marking an order paid + the automated delivery message (pings staff). */
async function announcePaid(interaction, order, actorId) {
  await interaction.reply({
    flags: V2,
    components: [deliveryView(order, actorId)],
    allowedMentions: { roles: config.tickets.staffRoleId ? [config.tickets.staffRoleId] : [] },
  });
}

/**
 * Buyer self-service: confirm they've sent a crypto/manual payment. Flips the
 * order to paid and triggers automated delivery — no staff step required.
 */
async function confirmPayment(interaction) {
  const data = store.read();
  const ticket = data.tickets[interaction.channel.id];
  const order = orders.getByChannel(interaction.channel.id);
  if (!order) {
    return interaction.reply({ content: 'No order is attached to this ticket.', ephemeral: true });
  }
  const isOwner = ticket?.ownerId === interaction.user.id;
  if (!isOwner && !isStaff(interaction)) {
    return interaction.reply({ content: 'Only the buyer can confirm their payment.', ephemeral: true });
  }
  if (order.status === 'paid' || order.status === 'delivered') {
    return interaction.reply({ content: `This order is already marked **${order.status}**.`, ephemeral: true });
  }
  if (order.status === 'cancelled') {
    return interaction.reply({ content: 'This order was cancelled — ask staff to reopen it.', ephemeral: true });
  }
  orders.setStatus(interaction.channel.id, 'paid', interaction.user.id);
  await announcePaid(interaction, order, interaction.user.id);
}

/** Staff moves a purchase order along its pipeline from inside the ticket. */
async function setOrderStatus(interaction, status) {
  if (!isStaff(interaction)) {
    return interaction.reply({ content: 'Only staff can update an order.', ephemeral: true });
  }
  const order = orders.setStatus(interaction.channel.id, status, interaction.user.id);
  if (!order) {
    return interaction.reply({ content: 'No order is attached to this ticket.', ephemeral: true });
  }
  // Marking paid fires the same automated delivery message as buyer self-confirm.
  if (status === 'paid') return announcePaid(interaction, order, interaction.user.id);
  const meta = orders.STATUS_META[status];
  const tone = status === 'cancelled' ? config.brand.danger : status === 'delivered' ? config.brand.success : config.brand.color;
  const view = container(tone, [
    text(`${meta.emoji} Order \`${order.id}\` marked **${meta.label}** by <@${interaction.user.id}>.`),
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

module.exports = { createTicket, claimTicket, closeTicket, setOrderStatus, confirmPayment, ticketControls };
