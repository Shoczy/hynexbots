const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const orders = require('../tickets/orders');
const { V2_EPHEMERAL, text, sep, container } = require('../lib/components');

function line(o) {
  const meta = orders.STATUS_META[o.status] || { emoji: '•', label: o.status };
  const where = o.channelId ? ` · <#${o.channelId}>` : '';
  const price = o.price ? ` · ${o.price}` : '';
  return `\`${o.id}\` ${meta.emoji} **${meta.label}** — ${o.productLabel}${price} · <@${o.ownerId}>${where}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orders')
    .setDescription('View the sales order pipeline.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('list')
        .setDescription('List recent orders, optionally filtered by status.')
        .addStringOption((o) =>
          o
            .setName('status')
            .setDescription('Only show orders with this status')
            .addChoices(
              { name: 'Pending', value: 'pending' },
              { name: 'Paid', value: 'paid' },
              { name: 'Delivered', value: 'delivered' },
              { name: 'Cancelled', value: 'cancelled' },
            ),
        ),
    ),

  async execute(interaction) {
    const filter = interaction.options.getString('status');
    const c = orders.counts();
    const list = orders.list(filter).slice(0, 15);

    const summary =
      `### Orders\n` +
      `${orders.STATUS_META.pending.emoji} ${c.pending} pending · ` +
      `${orders.STATUS_META.paid.emoji} ${c.paid} paid · ` +
      `${orders.STATUS_META.delivered.emoji} ${c.delivered} delivered · ` +
      `${orders.STATUS_META.cancelled.emoji} ${c.cancelled} cancelled`;

    const children = [text(summary), sep()];
    if (list.length === 0) {
      children.push(text(filter ? `No \`${filter}\` orders yet.` : 'No orders yet.'));
    } else {
      children.push(text(list.map(line).join('\n')));
      if (orders.list(filter).length > 15) children.push(text(`_…and more. Showing the latest 15._`));
    }

    return interaction.reply({
      flags: V2_EPHEMERAL,
      components: [container(config.brand.color, children)],
    });
  },
};
